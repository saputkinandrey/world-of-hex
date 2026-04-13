import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_STORE, EventStore } from '@event-nest/core';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { EncounterRepository } from '../repositories/encounter.repository';

import { Encounter, EncounterDocument, PlayerToEncounter, ShipToEncounter } from '../schemas/encounter.schema';
import { PendingIntentDocument } from '../schemas/pending-intent.schema';
import { TurnEntropyDocument } from '../schemas/turn-entropy.schema';
import { TurnAdvanceRequestDocument } from '../schemas/turn-advance-request.schema';
import { Player } from '../../player/schemas/player.schema';
import { ShipDocument } from '../schemas/ship.schema';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { EncounterAggregate } from '../domain/encounter/encounter.root';
import { EncounterRuleViolationError } from '../domain/encounter/errors/encounter-rule-violation.error';
import { Types } from 'mongoose';
import { toVector } from '../../utils/vector.schema';
import { axialToOffsetPoint, distanceBetweenAxialPoints, offsetToAxialPoint } from '../utils/hex-coordinate.util';
import { PlayerRepository } from '../../player/repositories/player.repository';
import { PendingIntentRepository } from '../repositories/pending-intent.repository';
import {
    EncounterActorType,
    PendingIntentStatus,
    PlayerShipIntentType,
    PendingShipIntentType,
    PendingShipSpawnIntentPayload,
} from '../types/pending-intent.type';
import { AllDirections, Direction } from '../types/direction.type';
import { TurnEntropyRepository } from '../repositories/turn-entropy.repository';
import { TurnAdvanceRequestStatus, TurnEntropyStatus, TurnTaskIntentInput } from '../types/turn-resolution.type';
import { TurnAdvanceRequestRepository } from '../repositories/turn-advance-request.repository';
import { EncounterEventReadRepository } from '../repositories/encounter-event-read.repository';
import { EncounterCleanupRepository } from '../repositories/encounter-cleanup.repository';
import {
    deserializeEncounterPendingIntents,
    serializePendingIntentForTaskSignature,
} from '../codecs/pending-intent.codec';
import {
    buildTurnTaskSignature,
    createBootstrapEntropySea,
    cursorFromTaskSignature,
    resolveAddressedChoice,
    resolveTurnTaskSeed,
    stableHash,
} from '../utils/turn-resolution.util';
import { EncounterTurnAdvancedEvent } from '../domain/encounter/events/encounter.events';
import {
    ENCOUNTER_TURN_ADVANCE_REQUESTED_EVENT,
    EncounterTurnAdvanceRequestedEvent,
} from '../types/turn-advance-requested-event.type';
import {
    EncounterPendingIntent,
    EncounterPendingIntentResolution,
    PendingEncounterIntentRandomness,
} from '../domain/encounter/types/encounter-pending-intent.type';

type EncounterTurnContext = {
    encounterId: string;
    turnNumber: number;
    aggregate: EncounterAggregate;
    pendingIntents: PendingIntentDocument[];
    pendingAdvanceRequests: TurnAdvanceRequestDocument[];
    turnCutoff: Date;
    taskSignatureHash: string;
    turnEntropy: TurnEntropyDocument;
};
type ProcessAdvanceTurnRequestResult = {
    encounterId: string;
};
type PendingIntentActor = {
    actorId: string;
    actorType: EncounterActorType;
};
type SubmitPlayerShipIntentInput = {
    encounterId: string;
    shipId: string;
    intentType: PlayerShipIntentType;
};
type OffsetPointInput = {
    x: number;
    y: number;
};
type ShipPlacementUpdate = {
    position: OffsetPointInput;
    direction?: string;
    speed?: number;
};
type EncounterProjectionShipEntry = {
    position: ReturnType<typeof axialToOffsetPoint>;
    direction: Direction;
    speed: number;
    ship: ShipToEncounter['ship'];
    intent?: ShipEncounterIntent | null;
};

@Injectable()
export class EncounterService {
    encounters: Encounter[] = [];

    constructor(
        private readonly encounterRepository: EncounterRepository,
        private readonly pendingIntentRepository: PendingIntentRepository,
        private readonly turnEntropyRepository: TurnEntropyRepository,
        private readonly turnAdvanceRequestRepository: TurnAdvanceRequestRepository,
        private readonly encounterEventReadRepository: EncounterEventReadRepository,
        private readonly encounterCleanupRepository: EncounterCleanupRepository,
        private readonly playerRepository: PlayerRepository,
        private readonly eventEmitter: EventEmitter2,
        @Inject(EVENT_STORE)
        private readonly eventStore: EventStore,
    ) {}

    private async loadEncounterAggregate(encounterId: string) {
        const aggregate = this.eventStore.addPublisher(new EncounterAggregate(encounterId));
        const events = await this.eventStore.findByAggregateRootId(EncounterAggregate, encounterId);
        if (events.length === 0) {
            throw new NotFoundException(`Encounter with id ${encounterId} not found`);
        }
        aggregate.reconstitute(events);
        return aggregate;
    }

    private async resolveCurrentTurnNumber(encounterId: string) {
        const turnAdvancedEvent = await this.encounterEventReadRepository.findLastEventOfType(
            encounterId,
            EncounterTurnAdvancedEvent,
        );
        const lastTurnNumber = turnAdvancedEvent?.getPayloadAs(EncounterTurnAdvancedEvent).turnNumber;
        if (this.isValidTurnNumber(lastTurnNumber)) {
            return lastTurnNumber;
        }

        const events = await this.eventStore.findByAggregateRootId(EncounterAggregate, encounterId);
        for (let index = events.length - 1; index >= 0; index -= 1) {
            const event = events[index];
            if (event.eventName !== EncounterTurnAdvancedEvent.name) {
                continue;
            }

            const turnNumber = event.getPayloadAs(EncounterTurnAdvancedEvent).turnNumber;
            if (this.isValidTurnNumber(turnNumber)) {
                return turnNumber;
            }
        }

        return 0;
    }

    private async loadEncounterTurnContext(
        turnAdvanceRequest: TurnAdvanceRequestDocument,
    ): Promise<EncounterTurnContext> {
        const encounterId = turnAdvanceRequest.encounterId;
        const turnNumber = turnAdvanceRequest.turnNumber;
        const aggregate = await this.loadEncounterAggregate(encounterId);
        if (aggregate.turnNumber !== turnNumber) {
            throw new ConflictException(
                `Encounter ${encounterId} is already on turn ${aggregate.turnNumber}, request ${turnAdvanceRequest._id} targets turn ${turnNumber}`,
            );
        }

        const pendingAdvanceRequests = await this.turnAdvanceRequestRepository.findPendingByEncounterTurn(
            encounterId,
            turnNumber,
        );
        const turnCutoff = this.resolveTurnCutoff(encounterId, turnNumber, pendingAdvanceRequests);
        const pendingIntents = await this.pendingIntentRepository.findActiveByEncounterTurnBefore(
            encounterId,
            turnNumber,
            turnCutoff,
        );
        const taskSignatureHash = this.buildTurnTaskSignatureHash(encounterId, aggregate, pendingIntents, turnCutoff);
        const turnEntropy = await this.ensureTurnEntropy(encounterId, turnNumber, taskSignatureHash);

        return {
            encounterId,
            turnNumber,
            aggregate,
            pendingIntents,
            pendingAdvanceRequests,
            turnCutoff,
            taskSignatureHash,
            turnEntropy,
        };
    }

    private resolveTurnCutoff(
        encounterId: string,
        turnNumber: number,
        pendingAdvanceRequests: TurnAdvanceRequestDocument[],
    ) {
        const firstRequest = pendingAdvanceRequests[0];
        if (!firstRequest?.createdAt) {
            throw new ConflictException(`Encounter ${encounterId} turn ${turnNumber} has no pending advance request`);
        }

        return firstRequest.createdAt;
    }

    private buildTurnTaskSignatureHash(
        encounterId: string,
        aggregate: EncounterAggregate,
        pendingIntents: PendingIntentDocument[],
        turnCutoff: Date,
    ) {
        return buildTurnTaskSignature({
            encounterId,
            turnNumber: aggregate.turnNumber,
            turnCutoff: turnCutoff.toISOString(),
            radius: aggregate.radius,
            center: aggregate.center,
            windDirection: aggregate.windrose.direction,
            ships: aggregate.ships.map((ship) => ({
                shipId: ship.shipId,
                position: ship.position,
                actualDirection: ship.actualDirection,
                actualSpeed: ship.actualSpeed,
                intent: ship.intent ?? null,
            })),
            intents: this.serializePendingIntentsForTaskSignature(pendingIntents),
        });
    }

    private serializePendingIntentsForTaskSignature(pendingIntents: PendingIntentDocument[]): TurnTaskIntentInput[] {
        return pendingIntents.map((intent) => serializePendingIntentForTaskSignature(intent));
    }

    private async ensureTurnEntropy(encounterId: string, turnNumber: number, taskSignatureHash: string) {
        const existing = await this.turnEntropyRepository.findOneByEncounterTurn(encounterId, turnNumber);
        if (existing) {
            if (existing.taskSignatureHash !== taskSignatureHash) {
                throw new ConflictException(
                    `Encounter ${encounterId} turn ${turnNumber} has mismatched task signature for prepared entropy`,
                );
            }
            return existing;
        }

        const previousTurnEntropy =
            turnNumber > 0
                ? await this.turnEntropyRepository.findOneByEncounterTurn(encounterId, turnNumber - 1)
                : null;
        const entropySea = previousTurnEntropy?.entropySea?.length
            ? [...previousTurnEntropy.entropySea]
            : createBootstrapEntropySea(encounterId);
        const cursor = cursorFromTaskSignature(taskSignatureHash, entropySea.length);

        return this.turnEntropyRepository.create({
            encounterId,
            turnNumber,
            taskSignatureHash,
            cursor,
            entropySea,
            status: TurnEntropyStatus.PREPARED,
        });
    }

    private buildDirectActionTaskSeed(purpose: string, scope: Record<string, unknown>) {
        return stableHash({
            kind: 'sea-combat-direct-action',
            version: 1,
            purpose,
            scope,
        });
    }

    private isValidTurnNumber(turnNumber: unknown): turnNumber is number {
        return typeof turnNumber === 'number' && Number.isInteger(turnNumber) && turnNumber >= 0;
    }

    private resolveDirectActionDirection(
        taskSeed: string,
        purpose: string,
        index: number,
        scope: Record<string, unknown>,
    ): Direction {
        return resolveAddressedChoice(taskSeed, { purpose, index, scope }, AllDirections);
    }

    private buildEncounterProjectionShips(aggregate: EncounterAggregate): EncounterProjectionShipEntry[] {
        return aggregate.ships.map((ship) => ({
            position: axialToOffsetPoint(ship.position),
            direction: ship.actualDirection,
            speed: ship.actualSpeed,
            ship: {
                _id: ship.ship.id as never,
                name: ship.ship.name,
                speed: ship.ship.speed,
                type: ship.ship.type,
                tactics: ship.ship.skills.tactics,
            } as ShipToEncounter['ship'],
            intent: ship.intent ?? null,
        }));
    }

    private synchronizeEncounterProjection(encounter: EncounterDocument, aggregate: EncounterAggregate) {
        encounter.name = aggregate.name;
        encounter.radius = aggregate.radius;
        encounter.center = axialToOffsetPoint(aggregate.center) as any;
        encounter.windDirection = aggregate.windrose.direction;
        encounter.currentTurn = aggregate.turnNumber;
        encounter.ships = this.buildEncounterProjectionShips(aggregate) as ShipToEncounter[];

        const activeShipIds = new Set(aggregate.ships.map((ship) => ship.shipId));
        let playersChanged = false;
        encounter.players.forEach((player) => {
            const selectedShipId = player.selectedShip?._id?.toString();
            if (!selectedShipId || activeShipIds.has(selectedShipId)) {
                return;
            }

            player.selectedShip = null as never;
            playersChanged = true;
        });

        encounter.markModified('ships');
        encounter.markModified('center');
        if (playersChanged) {
            encounter.markModified('players');
        }
    }

    private async persistEncounterProjection(encounterId: string, aggregate: EncounterAggregate) {
        const encounter = await this.encounterRepository.findOneById(encounterId);
        if (!encounter) {
            throw new NotFoundException(`Encounter projection with id ${encounterId} not found`);
        }

        this.synchronizeEncounterProjection(encounter, aggregate);
        return encounter.save();
    }

    private buildPendingIntentRandomness(context: EncounterTurnContext): PendingEncounterIntentRandomness {
        if (!context.turnEntropy.entropySea.length) {
            throw new BadRequestException(
                `Encounter ${context.encounterId} has no prepared entropy sea for turn ${context.aggregate.turnNumber}`,
            );
        }

        return {
            taskSeed: resolveTurnTaskSeed(context.turnEntropy.entropySea, context.turnEntropy.cursor),
            taskSignatureHash: context.taskSignatureHash,
        };
    }

    private deserializePendingTurnIntents(context: EncounterTurnContext): EncounterPendingIntent[] {
        const randomness = this.buildPendingIntentRandomness(context);
        return deserializeEncounterPendingIntents(context.pendingIntents, randomness);
    }

    private async persistPendingIntentResolutions(resolutions: EncounterPendingIntentResolution[]) {
        for (const item of resolutions) {
            await this.pendingIntentRepository.resolveIntent(item.intentId, item.status, item.resolutionReason);
        }
    }

    private async markTurnResolutionCommitted(context: EncounterTurnContext) {
        await this.turnAdvanceRequestRepository.updateManyStatus(
            context.encounterId,
            context.turnNumber,
            TurnAdvanceRequestStatus.COMMITTED,
        );
        await this.turnEntropyRepository.updateStatus(context.turnEntropy._id.toString(), TurnEntropyStatus.CONSUMED);
    }

    async createEncounter(name: string | null, radius: number) {
        const id = new Types.ObjectId().toHexString();
        const encounterAggregate = this.eventStore.addPublisher(new EncounterAggregate(id));
        const windDirection = this.resolveDirectActionDirection(
            this.buildDirectActionTaskSeed('create-encounter', {
                encounterId: id,
                name: name ?? null,
                radius,
            }),
            'create-encounter-wind-direction',
            0,
            {
                encounterId: id,
            },
        );
        encounterAggregate
            .setName(name)
            .moveCenter({ q: 0, r: 0 })
            .adjustRadius(radius)
            .reRollWindDirection(windDirection);
        await encounterAggregate.commit();
        return this.encounterRepository.create({
            _id: encounterAggregate.id,
            name: encounterAggregate.name,
            radius: encounterAggregate.radius,
            currentTurn: encounterAggregate.turnNumber,
            center: axialToOffsetPoint(encounterAggregate.center),
            windDirection: encounterAggregate.windrose.direction,
            players: [],
            ships: this.buildEncounterProjectionShips(encounterAggregate) as ShipToEncounter[],
        });
    }

    async findOneById(encounterId: string) {
        return this.encounterRepository.findOneById(encounterId);
    }

    async findAllEncounters() {
        return this.encounterRepository.find({}, {}, { sort: { createdAt: -1 } });
    }

    async deleteEncounter(encounterId: string) {
        return this.encounterCleanupRepository.deleteEncounter(encounterId);
    }

    async findEncounterViewById(encounterId: string) {
        const encounter = await this.findOneById(encounterId);
        if (!encounter) {
            return null;
        }

        const pendingIntents = await this.pendingIntentRepository.findActiveByEncounter(encounterId);

        return {
            ...encounter.toJSON(),
            pendingIntents: pendingIntents.map((intent) => intent.toJSON()),
        };
    }

    async cancelPendingIntent(encounterId: string, intentId: string) {
        const pendingIntent = await this.pendingIntentRepository.findOneById(intentId);
        if (!pendingIntent || pendingIntent.encounterId !== encounterId) {
            throw new NotFoundException(`Pending intent ${intentId} for encounter ${encounterId} not found`);
        }
        if (pendingIntent.status !== PendingIntentStatus.PENDING) {
            throw new ConflictException(`Pending intent ${intentId} is not cancellable anymore`);
        }

        const updatedIntent = await this.pendingIntentRepository.resolveIntent(
            intentId,
            PendingIntentStatus.CANCELLED,
            'Cancelled by admin',
        );
        if (!updatedIntent) {
            throw new NotFoundException(`Pending intent ${intentId} not found during cancellation`);
        }

        return updatedIntent;
    }

    async requestAdvanceTurn(encounterId: string) {
        const turnNumber = await this.resolveCurrentTurnNumber(encounterId);
        // TODO: This request is currently persisted and processed inside the same backend process.
        // Keep it as a temporary prototype solution. Any move away from in-process delivery
        // should happen only after the Godot client milestone, and the later P2P transport work
        // should happen after the future P2P storage migration.
        const turnAdvanceRequest = await this.turnAdvanceRequestRepository.create({
            encounterId,
            turnNumber,
            status: TurnAdvanceRequestStatus.PENDING,
        });
        const event: EncounterTurnAdvanceRequestedEvent = {
            requestId: turnAdvanceRequest._id.toString(),
        };

        await this.eventEmitter.emitAsync(ENCOUNTER_TURN_ADVANCE_REQUESTED_EVENT, event);
        return turnAdvanceRequest;
    }

    async processAdvanceTurnRequest(requestId: string): Promise<ProcessAdvanceTurnRequestResult> {
        const turnAdvanceRequest = await this.turnAdvanceRequestRepository.findOneById(requestId);
        if (!turnAdvanceRequest) {
            throw new NotFoundException(`Turn advance request with id ${requestId} not found`);
        }
        if (turnAdvanceRequest.status !== TurnAdvanceRequestStatus.PENDING) {
            throw new ConflictException(
                `Turn advance request ${requestId} is not pending and cannot be processed again`,
            );
        }

        try {
            const context = await this.loadEncounterTurnContext(turnAdvanceRequest);
            const { aggregate } = context;
            aggregate.setPendingIntents(this.deserializePendingTurnIntents(context));
            aggregate.advanceTurn();
            const intentResolutions = await aggregate.commitWithPendingIntentResolutions();
            await this.persistEncounterProjection(context.encounterId, aggregate);
            await this.markTurnResolutionCommitted(context);
            await this.persistPendingIntentResolutions(intentResolutions);
            return {
                encounterId: context.encounterId,
            };
        } catch (error) {
            await this.turnAdvanceRequestRepository.updateStatus(requestId, TurnAdvanceRequestStatus.REJECTED);
            this.rethrowEncounterRuleViolation(error);
        }
    }

    async submitPlayerShipIntent(player: Player, input: SubmitPlayerShipIntentInput) {
        const encounter = await this.encounterRepository.findOneById(input.encounterId);
        if (!encounter) {
            throw new NotFoundException(`Encounter with id ${input.encounterId} not found`);
        }
        const aggregate = await this.loadEncounterAggregate(input.encounterId);
        const hasPendingAdvanceRequest = await this.turnAdvanceRequestRepository.hasPendingByEncounterTurn(
            input.encounterId,
            aggregate.turnNumber,
        );
        const targetTurnNumber = hasPendingAdvanceRequest ? aggregate.turnNumber + 1 : aggregate.turnNumber;

        if (!this.isPlayerJoinedToEncounter(player, encounter)) {
            throw new BadRequestException(`Player ${player._id} is not joined to encounter ${input.encounterId}`);
        }

        const ownedShipIds = new Set(
            player.ownedShips
                ?.map((ownedShip) => ownedShip?._id?.toString())
                .filter((shipId): shipId is string => Boolean(shipId)) ?? [],
        );

        if (!ownedShipIds.has(input.shipId)) {
            throw new BadRequestException(`Ship ${input.shipId} is not owned by player ${player._id}`);
        }

        const encounterShip = aggregate.ships.find((entry) => entry.shipId === input.shipId);
        if (!encounterShip) {
            throw new BadRequestException(`Ship ${input.shipId} is not joined to encounter ${input.encounterId}`);
        }

        const intent = await this.pendingIntentRepository.create({
            encounterId: input.encounterId,
            turnNumber: targetTurnNumber,
            actorId: player._id.toString(),
            actorType: EncounterActorType.PLAYER,
            shipId: input.shipId,
            intentType: input.intentType,
            payload: {},
            status: PendingIntentStatus.PENDING,
        });

        await this.pendingIntentRepository.supersedeOtherShipIntents(
            input.encounterId,
            targetTurnNumber,
            input.shipId,
            intent._id.toString(),
        );

        return intent;
    }

    async shipJoinsEncounter(ship: ShipDocument, encounter: EncounterDocument, intent?: ShipEncounterIntent) {
        if (!intent) {
            throw new BadRequestException('Ship encounter intent is required to queue a ship spawn');
        }

        const encounterId = encounter._id?.toString();
        if (!encounterId) {
            throw new Error('Encounter id is missing');
        }
        const aggregate = await this.loadEncounterAggregate(encounterId);
        const hasPendingAdvanceRequest = await this.turnAdvanceRequestRepository.hasPendingByEncounterTurn(
            encounterId,
            aggregate.turnNumber,
        );
        this.assertCanQueueSpawnIntent(aggregate, encounterId, hasPendingAdvanceRequest);

        const shipId = ship._id?.toString();
        const shipName = ship.name;
        if (!shipName) {
            throw new BadRequestException(`Ship ${ship._id} must have a name before queuing a spawn intent`);
        }
        const existingEncounters = await this.encounterRepository.find(
            { 'ships.ship._id': ship._id },
            { _id: 1 },
            { limit: 1 },
        );
        if (existingEncounters.length > 0) {
            const existingId = existingEncounters[0]._id?.toString();
            const currentId = encounter._id?.toString();
            if (existingId && existingId !== currentId) {
                throw new Error(`Ship with id ${ship._id} already joined encounter ${existingId}`);
            }
        }

        const joinedShip = aggregate.ships.find((entry) => entry.shipId === shipId);
        if (joinedShip) {
            throw new Error(`Ship with id ${ship._id} already joined encounter ${encounter._id}`);
        }
        await this.assertShipHasNoActiveSpawnIntentElsewhere(shipId, encounterId);
        await this.assertShipOwnerHasNoOtherShipInEncounter(shipId, aggregate, encounterId);

        const actor = await this.resolveSpawnIntentActor(shipId);
        const queuedIntent = await this.pendingIntentRepository.create({
            encounterId,
            turnNumber: aggregate.turnNumber,
            actorId: actor.actorId,
            actorType: actor.actorType,
            shipId,
            intentType: PendingShipIntentType.SPAWN,
            payload: {
                intent,
                ship: {
                    name: shipName,
                    speed: ship.speed,
                    type: ship.type,
                    tactics: ship.tactics ?? 10,
                },
            } satisfies PendingShipSpawnIntentPayload,
            status: PendingIntentStatus.PENDING,
        });

        await this.pendingIntentRepository.supersedeOtherShipIntents(
            encounterId,
            aggregate.turnNumber,
            shipId,
            queuedIntent._id.toString(),
        );
        return queuedIntent;
    }

    private assertCanQueueSpawnIntent(
        aggregate: EncounterAggregate,
        encounterId: string,
        hasPendingAdvanceRequest: boolean,
    ) {
        try {
            aggregate.assertCanQueueSpawnIntent(hasPendingAdvanceRequest);
        } catch (error) {
            if (error instanceof EncounterRuleViolationError) {
                throw new ConflictException(error.message);
            }

            const message =
                error instanceof Error ? error.message : `Cannot queue ship spawn for encounter ${encounterId}`;
            throw new Error(message);
        }
    }

    private rethrowEncounterRuleViolation(error: unknown): never {
        if (error instanceof EncounterRuleViolationError) {
            throw new ConflictException(error.message);
        }

        throw error;
    }

    private async assertShipOwnerHasNoOtherShipInEncounter(
        shipId: string | undefined,
        aggregate: EncounterAggregate,
        encounterId: string,
    ) {
        if (!shipId) {
            return;
        }

        const owner = await this.playerRepository.findOwnerByShipId(shipId);
        if (!owner) {
            return;
        }

        const ownedShipIds = new Set(
            owner.ownedShips
                ?.map((ownedShip) => ownedShip?._id?.toString())
                .filter((ownedShipId): ownedShipId is string => Boolean(ownedShipId)) ?? [],
        );
        const conflictingShip = aggregate.ships.find((joinedShip) => {
            const joinedShipId = joinedShip.shipId;
            return Boolean(joinedShipId && joinedShipId !== shipId && ownedShipIds.has(joinedShipId));
        });

        if (!conflictingShip) {
            const pendingIntents = await this.pendingIntentRepository.findActiveByEncounterTurn(
                encounterId,
                aggregate.turnNumber,
            );
            const conflictingPendingIntent = pendingIntents.find((pendingIntent) => {
                return (
                    pendingIntent.intentType === PendingShipIntentType.SPAWN &&
                    pendingIntent.shipId !== shipId &&
                    ownedShipIds.has(pendingIntent.shipId)
                );
            });
            if (!conflictingPendingIntent) {
                return;
            }

            throw new ConflictException(
                `Player ${owner._id} already has pending ship ${conflictingPendingIntent.shipId} for encounter ${encounterId}`,
            );
        }

        throw new ConflictException(
            `Player ${owner._id} already has ship ${conflictingShip.shipId} in encounter ${encounterId}`,
        );
    }

    private async resolveSpawnIntentActor(shipId: string | undefined): Promise<PendingIntentActor> {
        if (!shipId) {
            throw new BadRequestException('Ship id is required to queue a spawn intent');
        }

        const owner = await this.playerRepository.findOwnerByShipId(shipId);
        if (owner) {
            return {
                actorId: owner._id.toString(),
                actorType: EncounterActorType.PLAYER,
            };
        }

        return {
            actorId: shipId,
            actorType: EncounterActorType.ADMIN,
        };
    }

    private async assertShipHasNoActiveSpawnIntentElsewhere(shipId: string | undefined, encounterId: string) {
        if (!shipId) {
            return;
        }

        const existingSpawnIntent = await this.pendingIntentRepository.findActiveByShipIdAndIntentType(
            shipId,
            PendingShipIntentType.SPAWN,
        );
        if (!existingSpawnIntent) {
            return;
        }
        if (existingSpawnIntent.encounterId === encounterId) {
            return;
        }

        throw new ConflictException(
            `Ship ${shipId} already has a pending spawn intent in encounter ${existingSpawnIntent.encounterId}`,
        );
    }

    async shipLeavesEncounter(ship: ShipDocument, encounter: EncounterDocument) {
        const shipId = ship._id?.toString();
        if (!shipId) {
            throw new BadRequestException('Ship id is required');
        }

        const aggregate = await this.loadEncounterAggregate(encounter._id.toString());
        const joinedShip = aggregate.ships.find((entry) => entry.shipId === shipId);
        if (!joinedShip) {
            throw new Error(`Ship with id ${ship._id} not joined encounter ${encounter._id}`);
        }

        aggregate.removeShip(shipId);
        await aggregate.commit();
        const savedEncounter = await this.persistEncounterProjection(encounter._id.toString(), aggregate);

        try {
            const owner = await this.playerRepository.findOwnerByShipId(shipId);
            if (!owner) {
                return savedEncounter;
            }

            const remainingOwnedShipIds =
                owner.ownedShips
                    ?.map((owned) => owned._id?.toString())
                    .filter((ownedShipId): ownedShipId is string => Boolean(ownedShipId && ownedShipId !== shipId)) ??
                [];

            await this.encounterRepository.disconnectPlayerWithoutShips(owner._id.toString(), remainingOwnedShipIds);
        } catch (error) {
            console.error('shipLeavesEncounter cleanup failed', error);
        }

        return savedEncounter;
    }

    async updateShipPlacement(ship: ShipDocument, encounter: EncounterDocument, update: ShipPlacementUpdate) {
        const shipId = ship._id?.toString();
        if (!shipId) {
            throw new BadRequestException('Ship id is required');
        }

        const aggregate = await this.loadEncounterAggregate(encounter._id.toString());
        const joinedShip = aggregate.ships.find((entry) => entry.shipId === shipId);
        if (!joinedShip) {
            throw new NotFoundException(`Ship with id ${ship._id} not joined encounter ${encounter._id}`);
        }

        const nextPosition = offsetToAxialPoint(toVector(update.position));
        const distanceFromCenter = distanceBetweenAxialPoints(nextPosition, aggregate.center);
        if (distanceFromCenter > aggregate.radius) {
            throw new BadRequestException(
                `Position (${nextPosition.q}, ${nextPosition.r}) is outside encounter radius ${aggregate.radius}`,
            );
        }

        const hasCollision = aggregate.ships.some((entry) => {
            if (entry.shipId === shipId) {
                return false;
            }

            return entry.position.q === nextPosition.q && entry.position.r === nextPosition.r;
        });
        if (hasCollision) {
            throw new ConflictException(`Position (${nextPosition.q}, ${nextPosition.r}) is already occupied`);
        }

        const nextSpeed = typeof update.speed === 'number' ? update.speed : joinedShip.actualSpeed;
        if (typeof update.speed === 'number') {
            const maxSpeed = joinedShip.ship?.speed ?? ship.speed ?? 0;
            if (update.speed < 0 || update.speed > maxSpeed) {
                throw new BadRequestException(`Speed ${update.speed} is outside allowed range 0..${maxSpeed}`);
            }
        }

        const nextDirection = (update.direction as Direction | undefined) ?? joinedShip.actualDirection;
        joinedShip.updatePlacement(nextPosition, nextDirection, nextSpeed);
        await aggregate.commit();
        return this.persistEncounterProjection(encounter._id.toString(), aggregate);
    }

    isPlayerJoinedToEncounter(player: Player, encounter: EncounterDocument) {
        const playerId = player._id?.toString();
        const joinedPlayer = encounter.players.find((plr) => plr._id?.toString() === playerId);
        return !!joinedPlayer;
    }

    async playerJoinsEncounter(player: Player, encounterId: string) {
        const foundEncounter = await this.encounterRepository.findOneById(encounterId);
        if (!foundEncounter) {
            throw new Error(`Encounter with id ${encounterId} not found`);
        }

        const playerId = player._id?.toString();
        let joinedPlayer = foundEncounter.players.find((plr) => plr._id?.toString() === playerId);
        if (!joinedPlayer) {
            joinedPlayer = {
                _id: player._id,
                name: player.name,
            } as PlayerToEncounter;
            foundEncounter.players.push(joinedPlayer);
            foundEncounter.markModified('players');
        }
        return foundEncounter.save().then(() => {
            return joinedPlayer;
        });
    }

    async playerLeaveEncounter(player: Player, encounterId: string) {
        const foundEncounter = await this.encounterRepository.findOneById(encounterId);
        if (!foundEncounter) {
            throw new Error(`Encounter with id ${encounterId} not found`);
        }

        const playerId = player._id?.toString();
        const joinedPlayer = foundEncounter.players.find((plr) => plr._id?.toString() === playerId);
        if (!joinedPlayer) {
            throw new Error(`Player with id ${player._id} not joined encounter ${encounterId}`);
        }
        foundEncounter.players = foundEncounter.players.filter((pl) => {
            return pl._id?.toString() !== playerId;
        });
        foundEncounter.markModified('players');
        return foundEncounter.save();
    }
}
