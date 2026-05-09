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
import { createShipCaptainTarget, ShipCaptainTarget, ShipCaptainTargetType } from '../types/ship-captain-target.type';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { EncounterAggregate } from '../domain/encounter/encounter.root';
import { EncounterRuleViolationError } from '../domain/encounter/errors/encounter-rule-violation.error';
import { Types } from 'mongoose';
import { toVector } from '../../utils/vector.schema';
import { axialToOffsetPoint, distanceBetweenAxialPoints, offsetToAxialPoint } from '../utils/hex-coordinate.util';
import type { AxialPoint } from '../utils/hex-coordinate.util';
import { PlayerRepository } from '../../player/repositories/player.repository';
import { PendingIntentRepository } from '../repositories/pending-intent.repository';
import {
    BOATSWAIN_PENDING_SHIP_INTENT_TYPES,
    CAPTAIN_PENDING_SHIP_INTENT_TYPES,
    EncounterActorType,
    HELMSMAN_PENDING_SHIP_INTENT_TYPES,
    PendingIntentStatus,
    PendingShipBoatswainIntentType,
    PendingShipHelmsmanIntentType,
    PendingShipIntentGroup,
    PendingShipIntentType,
    PendingShipSpawnIntentPayload,
    PlayerShipCaptainIntentType,
    PlayerShipBoatswainIntentType,
    PlayerShipHelmsmanIntentType,
    resolveCaptainPendingShipIntentType,
    resolvePendingShipIntentGroup,
} from '../types/pending-intent.type';
import { AllDirections, Direction, DirectionTurnLeft, DirectionTurnRight } from '../types/direction.type';
import { TurnEntropyRepository } from '../repositories/turn-entropy.repository';
import { TurnAdvanceRequestStatus, TurnEntropyStatus, TurnTaskIntentInput } from '../types/turn-resolution.type';
import { TurnAdvanceRequestRepository } from '../repositories/turn-advance-request.repository';
import { EncounterEventReadRepository } from '../repositories/encounter-event-read.repository';
import { EncounterCleanupRepository } from '../repositories/encounter-cleanup.repository';
import {
    deserializeEncounterPendingIntents,
    serializePendingIntentForTaskSignature,
} from '../codecs/pending-intent.codec';
import { EncounterWorkspaceView } from '../types/encounter-workspace-view.type';
import { EncounterTurnDelta, EncounterTurnDeltaShipView } from '../types/encounter-turn-delta.type';
import { EncounterActionForecast, EncounterLastTurnRollResult } from '../types/encounter-workspace-view.type';
import { deriveCaptainShipOrders } from '../utils/captain-intent.util';
import { buildEncounterMovementPreview } from '../utils/encounter-movement-preview.util';
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
    ShipAcceleratedEvent,
    ShipDeceleratedEvent,
    ShipSpawnedEvent,
    ShipTurnedLeftEvent,
    ShipTurnedRightEvent,
} from '../domain/encounter/events/ship.events';
import {
    ENCOUNTER_TURN_ADVANCE_REQUESTED_EVENT,
    EncounterTurnAdvanceRequestedEvent,
} from '../types/turn-advance-requested-event.type';
import {
    EncounterPendingIntent,
    EncounterPendingIntentResolution,
    PendingEncounterIntentRandomness,
} from '../domain/encounter/types/encounter-pending-intent.type';
import { Roll3d6UnderWithCritResult } from '../../rps/utils/roll';

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
    turnDelta: EncounterTurnDelta;
};
type PendingIntentActor = {
    actorId: string;
    actorType: EncounterActorType;
};
type SubmitPlayerShipManeuverIntentsInput = {
    encounterId: string;
    shipId: string;
    helmsmanIntent: PlayerShipHelmsmanIntentType;
    boatswainIntent: PlayerShipBoatswainIntentType;
};
type SubmitPlayerShipCaptainIntentInput = {
    encounterId: string;
    shipId: string;
    captainIntent: PlayerShipCaptainIntentType;
};
type SetPlayerShipCaptainTargetInput = {
    encounterId: string;
    shipId: string;
    targetType: ShipCaptainTargetType;
    targetShipId: string | null;
};
type SubmitPlayerShipOrderContext = {
    encounter: EncounterDocument;
    aggregate: EncounterAggregate;
    targetTurnNumber: number;
    actorId: string;
};
type SubmitPlayerShipTargetResult = {
    shipId: string;
    target: ShipCaptainTarget;
    actionForecasts: EncounterActionForecast[];
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
    target: ShipCaptainTarget;
};
type EncounterMovementPreviewShipInput = {
    shipId: string;
    shipName: string;
    position: OffsetPointInput;
    direction: Direction;
    speed: number;
};
type EncounterProjectionShipSnapshot = EncounterTurnDeltaShipView;
type PendingIntentCarryOverCandidate = {
    sourceIntent: PendingIntentDocument;
    shipId: string;
    group: PendingShipIntentGroup;
};
type PendingIntentCarryOverContext = {
    encounterId: string;
    nextTurnNumber: number;
    sourceIntents: PendingIntentDocument[];
    resolutions: EncounterPendingIntentResolution[];
};
type EncounterTurnRollEventPayload =
    | ShipAcceleratedEvent
    | ShipDeceleratedEvent
    | ShipTurnedLeftEvent
    | ShipTurnedRightEvent
    | ShipSpawnedEvent;
type EncounterRollForecastInput = {
    aggregate: EncounterAggregate;
    shipId: string;
    shipName: string;
    position: AxialPoint;
    direction: Direction;
    speed: number;
    target: ShipCaptainTarget;
    baseSkill: number;
    modifierTotal: number;
};

const TAILWIND_SEAMANSHIP_MODIFIER = 6;
const REAR_SIDE_WIND_SEAMANSHIP_MODIFIER = 2;
const FRONT_SIDE_WIND_SEAMANSHIP_MODIFIER = -2;
const HEADWIND_SEAMANSHIP_MODIFIER = -6;
const THREE_D6_SUM_COUNTS = [1, 3, 6, 10, 15, 21, 25, 27, 27, 25, 21, 15, 10, 6, 3, 1] as const;
const THREE_D6_TOTAL_COMBINATIONS = 216;

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
            target: ship.target,
        }));
    }

    private buildEncounterProjectionShipSnapshots(aggregate: EncounterAggregate): EncounterProjectionShipSnapshot[] {
        return aggregate.ships.map((ship) => ({
            position: axialToOffsetPoint(ship.position),
            direction: ship.actualDirection,
            speed: ship.actualSpeed,
            ship: {
                _id: ship.shipId,
                name: ship.ship.name,
                speed: ship.ship.speed,
                type: ship.ship.type,
                tactics: ship.ship.skills.tactics,
            },
            intent: ship.intent ?? null,
            target: ship.target,
        }));
    }

    private buildEncounterMovementPreviewFromProjectionShips(
        center: OffsetPointInput,
        radius: number,
        ships: EncounterProjectionShipSnapshot[],
    ) {
        return buildEncounterMovementPreview({
            center,
            radius,
            ships: ships.map((ship) => ({
                shipId: ship.ship._id,
                shipName: ship.ship.name,
                position: ship.position,
                direction: ship.direction,
                speed: ship.speed,
            })),
        });
    }

    private buildEncounterTurnDelta(
        encounterId: string,
        currentTurn: number,
        previousShips: EncounterProjectionShipSnapshot[],
        aggregate: EncounterAggregate,
        lastTurnRollResults: EncounterLastTurnRollResult[],
    ): EncounterTurnDelta {
        const nextShips = this.buildEncounterProjectionShipSnapshots(aggregate);
        const previousByShipId = new Map(previousShips.map((ship) => [ship.ship._id, ship]));
        const nextByShipId = new Map(nextShips.map((ship) => [ship.ship._id, ship]));
        const changedShips = nextShips.filter((ship) => {
            const previous = previousByShipId.get(ship.ship._id);
            if (!previous) {
                return true;
            }

            return (
                previous.position.x !== ship.position.x ||
                previous.position.y !== ship.position.y ||
                previous.direction !== ship.direction ||
                previous.speed !== ship.speed ||
                previous.intent !== ship.intent
            );
        });
        const removedShipIds = previousShips.map((ship) => ship.ship._id).filter((shipId) => !nextByShipId.has(shipId));
        const movementPreview = this.buildEncounterMovementPreviewFromProjectionShips(
            axialToOffsetPoint(aggregate.center),
            aggregate.radius,
            nextShips,
        );
        const resolvedMovement = this.buildEncounterMovementPreviewFromProjectionShips(
            axialToOffsetPoint(aggregate.center),
            aggregate.radius,
            previousShips,
        );

        return {
            encounterId,
            currentTurn,
            windDirection: aggregate.windrose.direction,
            ships: changedShips,
            removedShipIds,
            resolvedTrajectories: resolvedMovement.projectedTrajectories,
            resolvedCrossings: resolvedMovement.predictedCrossings,
            projectedTrajectories: movementPreview.projectedTrajectories,
            predictedCrossings: movementPreview.predictedCrossings,
            actionForecasts: this.buildEncounterActionForecasts(aggregate),
            lastTurnRollResults,
        };
    }

    private buildEncounterActionForecasts(aggregate: EncounterAggregate): EncounterActionForecast[] {
        return aggregate.ships.flatMap((ship) => {
            const baseSkill = ship.ship.skills.seamanship;
            const modifierTotal = ship.modifierBucket.total('seamanship');
            const windModifier = this.resolveWindSeamanshipModifier(ship.actualDirection, aggregate.windrose.direction);
            const commonInput: EncounterRollForecastInput = {
                aggregate,
                shipId: ship.shipId,
                shipName: ship.ship.name,
                position: ship.position,
                direction: ship.actualDirection,
                speed: ship.actualSpeed,
                target: ship.target,
                baseSkill,
                modifierTotal,
            };
            const hasTurningSpeed = ship.actualSpeed >= 1;

            return [
                this.buildAutomaticForecast(
                    commonInput,
                    PendingShipIntentType.HELMSMAN_FORWARD,
                    PendingShipIntentType.BOATSWAIN_HOLD,
                    'Forward / Hold Speed',
                    null,
                ),
                this.buildRollForecast(
                    commonInput,
                    PendingShipIntentType.HELMSMAN_FORWARD,
                    PendingShipIntentType.BOATSWAIN_ACCELERATE,
                    'Forward / Accelerate',
                    windModifier,
                    null,
                ),
                this.buildRollForecast(
                    commonInput,
                    PendingShipIntentType.HELMSMAN_FORWARD,
                    PendingShipIntentType.BOATSWAIN_DECELERATE,
                    'Forward / Decelerate',
                    -windModifier,
                    'Uses reverse wind modifier',
                ),
                this.buildAutomaticForecast(
                    commonInput,
                    PendingShipIntentType.HELMSMAN_TURN_LEFT,
                    PendingShipIntentType.BOATSWAIN_HOLD,
                    'Turn Left / Slow Down',
                    hasTurningSpeed ? 'Automatic speed loss by 1' : 'Requires speed 1+',
                    hasTurningSpeed,
                ),
                this.buildRollForecast(
                    commonInput,
                    PendingShipIntentType.HELMSMAN_TURN_LEFT,
                    PendingShipIntentType.BOATSWAIN_ACCELERATE,
                    'Turn Left / Keep Speed',
                    windModifier,
                    hasTurningSpeed ? null : 'Requires speed 1+',
                    hasTurningSpeed,
                ),
                this.buildAutomaticForecast(
                    commonInput,
                    PendingShipIntentType.HELMSMAN_TURN_RIGHT,
                    PendingShipIntentType.BOATSWAIN_HOLD,
                    'Turn Right / Slow Down',
                    hasTurningSpeed ? 'Automatic speed loss by 1' : 'Requires speed 1+',
                    hasTurningSpeed,
                ),
                this.buildRollForecast(
                    commonInput,
                    PendingShipIntentType.HELMSMAN_TURN_RIGHT,
                    PendingShipIntentType.BOATSWAIN_ACCELERATE,
                    'Turn Right / Keep Speed',
                    windModifier,
                    hasTurningSpeed ? null : 'Requires speed 1+',
                    hasTurningSpeed,
                ),
                this.buildCaptainForecast(commonInput, ShipEncounterIntent.FLEE),
                this.buildCaptainForecast(commonInput, ShipEncounterIntent.PURSUE),
                this.buildCaptainForecast(commonInput, ShipEncounterIntent.CIRCLE),
            ];
        });
    }

    private buildEncounterActionForecastsForShip(
        aggregate: EncounterAggregate,
        shipId: string,
    ): EncounterActionForecast[] {
        return this.buildEncounterActionForecasts(aggregate).filter((forecast) => forecast.shipId === shipId);
    }

    private buildAutomaticForecast(
        input: EncounterRollForecastInput,
        helmsmanIntent: PendingShipHelmsmanIntentType,
        boatswainIntent: PendingShipBoatswainIntentType,
        label: string,
        note: string | null,
        available: boolean = true,
        captainIntent: ShipEncounterIntent | null = null,
    ): EncounterActionForecast {
        return {
            shipId: input.shipId,
            shipName: input.shipName,
            captainIntent,
            helmsmanIntent,
            boatswainIntent,
            label,
            available,
            requiresRoll: false,
            successChance: null,
            target: null,
            baseSkill: null,
            modifierTotal: null,
            windModifier: null,
            note,
        };
    }

    private buildRollForecast(
        input: EncounterRollForecastInput,
        helmsmanIntent: PendingShipHelmsmanIntentType,
        boatswainIntent: PendingShipBoatswainIntentType,
        label: string,
        windModifier: number,
        note: string | null,
        available: boolean = true,
        captainIntent: ShipEncounterIntent | null = null,
    ): EncounterActionForecast {
        const target = input.baseSkill + input.modifierTotal + windModifier;

        return {
            shipId: input.shipId,
            shipName: input.shipName,
            captainIntent,
            helmsmanIntent,
            boatswainIntent,
            label,
            available,
            requiresRoll: true,
            successChance: available ? this.calculate3d6UnderSuccessChance(target) : null,
            target: available ? target : null,
            baseSkill: input.baseSkill,
            modifierTotal: input.modifierTotal,
            windModifier,
            note,
        };
    }

    private buildCaptainForecast(
        input: EncounterRollForecastInput,
        captainIntent: ShipEncounterIntent,
    ): EncounterActionForecast {
        const derivedOrders = deriveCaptainShipOrders({
            captainIntent,
            ship: {
                shipId: input.shipId,
                position: input.position,
                direction: input.direction,
                speed: input.speed,
            },
            target: input.target,
            otherShips: input.aggregate.ships
                .filter((ship) => ship.shipId !== input.shipId)
                .map((ship) => ({
                    shipId: ship.shipId,
                    position: ship.position,
                    direction: ship.actualDirection,
                    speed: ship.actualSpeed,
                })),
        });
        const derivedLabel = this.buildCaptainForecastDerivedLabel(
            derivedOrders.helmsmanIntent,
            derivedOrders.boatswainIntent,
        );
        const note = `Captain tactic derives ${derivedLabel.toLowerCase()}`;
        const label = `Captain: ${this.formatShipEncounterIntentLabel(captainIntent)}`;
        const windModifier = this.resolveWindSeamanshipModifier(input.direction, input.aggregate.windrose.direction);
        const hasTurningSpeed = input.speed >= 1;

        if (
            derivedOrders.helmsmanIntent === PendingShipIntentType.HELMSMAN_TURN_LEFT ||
            derivedOrders.helmsmanIntent === PendingShipIntentType.HELMSMAN_TURN_RIGHT
        ) {
            if (derivedOrders.boatswainIntent === PendingShipIntentType.BOATSWAIN_ACCELERATE) {
                return this.buildRollForecast(
                    input,
                    derivedOrders.helmsmanIntent,
                    derivedOrders.boatswainIntent,
                    label,
                    windModifier,
                    hasTurningSpeed ? note : 'Requires speed 1+',
                    hasTurningSpeed,
                    captainIntent,
                );
            }

            return this.buildAutomaticForecast(
                input,
                derivedOrders.helmsmanIntent,
                derivedOrders.boatswainIntent,
                label,
                hasTurningSpeed ? note : 'Requires speed 1+',
                hasTurningSpeed,
                captainIntent,
            );
        }

        if (derivedOrders.boatswainIntent === PendingShipIntentType.BOATSWAIN_ACCELERATE) {
            return this.buildRollForecast(
                input,
                derivedOrders.helmsmanIntent,
                derivedOrders.boatswainIntent,
                label,
                windModifier,
                note,
                true,
                captainIntent,
            );
        }

        return this.buildAutomaticForecast(
            input,
            derivedOrders.helmsmanIntent,
            derivedOrders.boatswainIntent,
            label,
            note,
            true,
            captainIntent,
        );
    }

    private buildCaptainForecastDerivedLabel(
        helmsmanIntent: PendingShipHelmsmanIntentType,
        boatswainIntent: PendingShipBoatswainIntentType,
    ) {
        return `${this.formatHelmsmanForecastLabel(helmsmanIntent)} / ${this.formatBoatswainForecastLabel(boatswainIntent, helmsmanIntent)}`;
    }

    private formatShipEncounterIntentLabel(intent: ShipEncounterIntent) {
        switch (intent) {
            case ShipEncounterIntent.FLEE:
                return 'Flee';
            case ShipEncounterIntent.PURSUE:
                return 'Pursue';
            case ShipEncounterIntent.CIRCLE:
                return 'Circle';
            default:
                return intent;
        }
    }

    private formatHelmsmanForecastLabel(intent: PendingShipHelmsmanIntentType) {
        switch (intent) {
            case PendingShipIntentType.HELMSMAN_FORWARD:
                return 'Forward';
            case PendingShipIntentType.HELMSMAN_TURN_LEFT:
                return 'Turn Left';
            case PendingShipIntentType.HELMSMAN_TURN_RIGHT:
                return 'Turn Right';
            default:
                return intent;
        }
    }

    private formatBoatswainForecastLabel(
        intent: PendingShipBoatswainIntentType,
        helmsmanIntent: PendingShipHelmsmanIntentType,
    ) {
        if (
            helmsmanIntent !== PendingShipIntentType.HELMSMAN_FORWARD &&
            intent === PendingShipIntentType.BOATSWAIN_HOLD
        ) {
            return 'Slow Down';
        }
        if (
            helmsmanIntent !== PendingShipIntentType.HELMSMAN_FORWARD &&
            intent === PendingShipIntentType.BOATSWAIN_ACCELERATE
        ) {
            return 'Keep Speed';
        }

        switch (intent) {
            case PendingShipIntentType.BOATSWAIN_HOLD:
                return 'Hold Speed';
            case PendingShipIntentType.BOATSWAIN_ACCELERATE:
                return 'Accelerate';
            case PendingShipIntentType.BOATSWAIN_DECELERATE:
                return 'Decelerate';
            default:
                return intent;
        }
    }

    private buildEncounterLastTurnRollResults(
        aggregate: EncounterAggregate,
        turnNumber: number,
    ): EncounterLastTurnRollResult[] {
        return aggregate.uncommittedEvents.flatMap((event) => {
            const payload = event.payload as EncounterTurnRollEventPayload;
            if (payload instanceof ShipAcceleratedEvent) {
                const ship = aggregate.ships.find((entry) => entry.shipId === payload.shipId);
                if (!ship) {
                    return [];
                }

                return [
                    this.buildTurnRollResult(turnNumber, {
                        shipId: payload.shipId,
                        shipName: ship.ship.name,
                        actionKey: 'boatswain-accelerate',
                        label: 'Accelerate',
                        direction: ship.actualDirection,
                        roll: payload.seamanshipRoll,
                        windModifier: this.resolveWindSeamanshipModifier(
                            ship.actualDirection,
                            aggregate.windrose.direction,
                        ),
                        note: null,
                    }),
                ];
            }

            if (payload instanceof ShipDeceleratedEvent) {
                const ship = aggregate.ships.find((entry) => entry.shipId === payload.shipId);
                if (!ship) {
                    return [];
                }

                return [
                    this.buildTurnRollResult(turnNumber, {
                        shipId: payload.shipId,
                        shipName: ship.ship.name,
                        actionKey: 'boatswain-decelerate',
                        label: 'Decelerate',
                        direction: ship.actualDirection,
                        roll: payload.seamanshipRoll,
                        windModifier: -this.resolveWindSeamanshipModifier(
                            ship.actualDirection,
                            aggregate.windrose.direction,
                        ),
                        note: 'Used reverse wind modifier',
                    }),
                ];
            }

            if (payload instanceof ShipTurnedLeftEvent && payload.seamanshipRoll) {
                const beforeTurnDirection = DirectionTurnRight[payload.direction];
                const ship = aggregate.ships.find((entry) => entry.shipId === payload.shipId);
                if (!ship) {
                    return [];
                }

                return [
                    this.buildTurnRollResult(turnNumber, {
                        shipId: payload.shipId,
                        shipName: ship.ship.name,
                        actionKey: 'helmsman-turn-left-keep-speed',
                        label: 'Turn Left / Keep Speed',
                        direction: payload.direction,
                        roll: payload.seamanshipRoll,
                        windModifier: this.resolveWindSeamanshipModifier(
                            beforeTurnDirection,
                            aggregate.windrose.direction,
                        ),
                        note: null,
                    }),
                ];
            }

            if (payload instanceof ShipTurnedRightEvent && payload.seamanshipRoll) {
                const beforeTurnDirection = DirectionTurnLeft[payload.direction];
                const ship = aggregate.ships.find((entry) => entry.shipId === payload.shipId);
                if (!ship) {
                    return [];
                }

                return [
                    this.buildTurnRollResult(turnNumber, {
                        shipId: payload.shipId,
                        shipName: ship.ship.name,
                        actionKey: 'helmsman-turn-right-keep-speed',
                        label: 'Turn Right / Keep Speed',
                        direction: payload.direction,
                        roll: payload.seamanshipRoll,
                        windModifier: this.resolveWindSeamanshipModifier(
                            beforeTurnDirection,
                            aggregate.windrose.direction,
                        ),
                        note: null,
                    }),
                ];
            }

            if (payload instanceof ShipSpawnedEvent) {
                return [
                    this.buildTurnRollResult(turnNumber, {
                        shipId: payload.ship.id,
                        shipName: payload.ship.name,
                        actionKey: 'spawn-seamanship',
                        label: 'Deployment Seamanship',
                        direction: payload.direction,
                        roll: payload.seamanshipRoll,
                        windModifier: 0,
                        note: null,
                    }),
                    this.buildTurnRollResult(turnNumber, {
                        shipId: payload.ship.id,
                        shipName: payload.ship.name,
                        actionKey: 'spawn-tactics',
                        label: 'Deployment Tactics',
                        direction: payload.direction,
                        roll: payload.tacticsRoll,
                        windModifier: 0,
                        note: null,
                    }),
                ];
            }

            return [];
        });
    }

    private buildTurnRollResult(
        turnNumber: number,
        input: {
            shipId: string;
            shipName: string;
            actionKey: string;
            label: string;
            direction: Direction;
            roll: Roll3d6UnderWithCritResult;
            windModifier: number;
            note: string | null;
        },
    ): EncounterLastTurnRollResult {
        return {
            shipId: input.shipId,
            shipName: input.shipName,
            turnNumber,
            actionKey: input.actionKey,
            label: input.label,
            direction: input.direction,
            roll: input.roll.roll,
            target: input.roll.roll + input.roll.mos,
            mos: input.roll.mos,
            success: input.roll.mos >= 0,
            isCritSuccess: input.roll.isCritSuccess,
            isCritFailure: input.roll.isCritFailure,
            windModifier: input.windModifier,
            note: input.note,
        };
    }

    private calculate3d6UnderSuccessChance(target: number) {
        if (target < 3) {
            return 0;
        }
        if (target >= 18) {
            return 100;
        }

        let successfulOutcomes = 0;
        for (let total = 3; total <= 18; total += 1) {
            if (total > target) {
                continue;
            }
            successfulOutcomes += THREE_D6_SUM_COUNTS[total - 3];
        }

        return Math.round((successfulOutcomes / THREE_D6_TOTAL_COMBINATIONS) * 1000) / 10;
    }

    private resolveWindSeamanshipModifier(direction: Direction, windDirection: Direction) {
        const bowIndex = AllDirections.indexOf(direction);
        const windIndex = AllDirections.indexOf(windDirection);
        const relativeWindIndex = (windIndex - bowIndex + AllDirections.length) % AllDirections.length;

        if (relativeWindIndex === 3) {
            return TAILWIND_SEAMANSHIP_MODIFIER;
        }
        if (relativeWindIndex === 2 || relativeWindIndex === 4) {
            return REAR_SIDE_WIND_SEAMANSHIP_MODIFIER;
        }
        if (relativeWindIndex === 1 || relativeWindIndex === 5) {
            return FRONT_SIDE_WIND_SEAMANSHIP_MODIFIER;
        }

        return HEADWIND_SEAMANSHIP_MODIFIER;
    }

    private synchronizeEncounterProjection(
        encounter: EncounterDocument,
        aggregate: EncounterAggregate,
        lastTurnRollResults: EncounterLastTurnRollResult[],
    ) {
        encounter.name = aggregate.name;
        encounter.radius = aggregate.radius;
        encounter.center = axialToOffsetPoint(aggregate.center) as any;
        encounter.windDirection = aggregate.windrose.direction;
        encounter.currentTurn = aggregate.turnNumber;
        encounter.ships = this.buildEncounterProjectionShips(aggregate) as ShipToEncounter[];
        encounter.lastTurnRollResults = lastTurnRollResults;

        encounter.markModified('ships');
        encounter.markModified('center');
        encounter.markModified('lastTurnRollResults');
    }

    private async persistEncounterProjection(
        encounterId: string,
        aggregate: EncounterAggregate,
        lastTurnRollResults: EncounterLastTurnRollResult[],
    ) {
        const encounter = await this.encounterRepository.findOneById(encounterId);
        if (!encounter) {
            throw new NotFoundException(`Encounter projection with id ${encounterId} not found`);
        }

        this.synchronizeEncounterProjection(encounter, aggregate, lastTurnRollResults);
        return encounter.save();
    }

    private async persistEncounterProjectionWithCurrentRollResults(encounterId: string, aggregate: EncounterAggregate) {
        const encounter = await this.encounterRepository.findOneById(encounterId);
        if (!encounter) {
            throw new NotFoundException(`Encounter projection with id ${encounterId} not found`);
        }

        this.synchronizeEncounterProjection(encounter, aggregate, encounter.lastTurnRollResults ?? []);
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

    private async carryOverShipManeuverIntents(context: PendingIntentCarryOverContext) {
        const consumedResolutionIds = new Set(
            context.resolutions
                .filter((resolution) => resolution.status === PendingIntentStatus.CONSUMED)
                .map((resolution) => resolution.intentId),
        );
        const effectiveCandidates = new Map<string, PendingIntentCarryOverCandidate>();
        context.sourceIntents.forEach((intent) => {
            const intentId = intent._id.toString();
            if (!consumedResolutionIds.has(intentId)) {
                return;
            }
            if (intent.intentType === PendingShipIntentType.SPAWN) {
                return;
            }

            const group = resolvePendingShipIntentGroup(intent.intentType);
            const candidateKey = `${intent.shipId}:${group}`;
            effectiveCandidates.set(candidateKey, {
                sourceIntent: intent,
                shipId: intent.shipId,
                group,
            });
        });

        if (effectiveCandidates.size === 0) {
            const nextTurnPendingIntents = await this.pendingIntentRepository.findActiveByEncounterTurn(
                context.encounterId,
                context.nextTurnNumber,
            );
            return this.carryOverCaptainTacticsFromConsumedSpawns(
                context,
                nextTurnPendingIntents,
                consumedResolutionIds,
            );
        }

        const nextTurnPendingIntents = await this.pendingIntentRepository.findActiveByEncounterTurn(
            context.encounterId,
            context.nextTurnNumber,
        );
        const existingGroupsByShip = new Map<string, Set<PendingShipIntentGroup>>();
        nextTurnPendingIntents
            .filter((intent) => intent.intentType !== PendingShipIntentType.SPAWN)
            .forEach((intent) => {
                const current = existingGroupsByShip.get(intent.shipId) ?? new Set<PendingShipIntentGroup>();
                current.add(resolvePendingShipIntentGroup(intent.intentType));
                existingGroupsByShip.set(intent.shipId, current);
            });

        const createdIntents: PendingIntentDocument[] = [];
        for (const [candidateKey, candidate] of effectiveCandidates.entries()) {
            if (this.isCarryOverIntentBlocked(candidate, existingGroupsByShip.get(candidate.shipId))) {
                continue;
            }

            const createdIntent = await this.pendingIntentRepository.create({
                encounterId: context.encounterId,
                turnNumber: context.nextTurnNumber,
                actorId: candidate.sourceIntent.actorId,
                actorType: candidate.sourceIntent.actorType,
                shipId: candidate.sourceIntent.shipId,
                intentType: candidate.sourceIntent.intentType,
                payload: candidate.sourceIntent.payload ?? {},
                status: PendingIntentStatus.PENDING,
            });
            createdIntents.push(createdIntent);
            const nextGroups = existingGroupsByShip.get(candidate.shipId) ?? new Set<PendingShipIntentGroup>();
            nextGroups.add(candidate.group);
            existingGroupsByShip.set(candidate.shipId, nextGroups);
        }

        const spawnCreatedIntents = await this.carryOverCaptainTacticsFromConsumedSpawns(
            context,
            nextTurnPendingIntents,
            consumedResolutionIds,
            existingGroupsByShip,
        );

        createdIntents.push(...spawnCreatedIntents);
        return createdIntents;
    }

    private async carryOverCaptainTacticsFromConsumedSpawns(
        context: PendingIntentCarryOverContext,
        nextTurnPendingIntents: PendingIntentDocument[],
        consumedResolutionIds: Set<string>,
        existingGroupsByShipInput?: Map<string, Set<PendingShipIntentGroup>>,
    ) {
        const createdIntents: PendingIntentDocument[] = [];
        const existingGroupsByShip = existingGroupsByShipInput ?? new Map<string, Set<PendingShipIntentGroup>>();
        if (!existingGroupsByShipInput) {
            nextTurnPendingIntents
                .filter((intent) => intent.intentType !== PendingShipIntentType.SPAWN)
                .forEach((intent) => {
                    const groups = existingGroupsByShip.get(intent.shipId) ?? new Set<PendingShipIntentGroup>();
                    groups.add(resolvePendingShipIntentGroup(intent.intentType));
                    existingGroupsByShip.set(intent.shipId, groups);
                });
        }

        for (const intent of context.sourceIntents) {
            if (intent.intentType !== PendingShipIntentType.SPAWN) {
                continue;
            }
            if (!consumedResolutionIds.has(intent._id.toString())) {
                continue;
            }

            const encounterIntent = this.resolveSpawnPayloadCaptainIntent(intent.payload);
            if (!encounterIntent) {
                continue;
            }

            const shipGroups = existingGroupsByShip.get(intent.shipId) ?? new Set<PendingShipIntentGroup>();
            const carryOverSpecs = [
                {
                    group: PendingShipIntentGroup.CAPTAIN,
                    intentType: resolveCaptainPendingShipIntentType(encounterIntent),
                },
                {
                    group: PendingShipIntentGroup.HELMSMAN,
                    intentType: PendingShipIntentType.HELMSMAN_OBEY_CAPTAIN,
                },
                {
                    group: PendingShipIntentGroup.BOATSWAIN,
                    intentType: PendingShipIntentType.BOATSWAIN_OBEY_CAPTAIN,
                },
            ] as const;

            for (const spec of carryOverSpecs) {
                if (shipGroups.has(spec.group)) {
                    continue;
                }

                const createdIntent = await this.pendingIntentRepository.create({
                    encounterId: context.encounterId,
                    turnNumber: context.nextTurnNumber,
                    actorId: intent.actorId,
                    actorType: intent.actorType,
                    shipId: intent.shipId,
                    intentType: spec.intentType,
                    payload: {},
                    status: PendingIntentStatus.PENDING,
                });
                createdIntents.push(createdIntent);
                shipGroups.add(spec.group);
            }

            existingGroupsByShip.set(intent.shipId, shipGroups);
        }

        return createdIntents;
    }

    private resolveSpawnPayloadCaptainIntent(payload: unknown): ShipEncounterIntent | null {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const record = payload as Record<string, unknown>;
        const intent = record.intent;
        if (
            intent === ShipEncounterIntent.FLEE ||
            intent === ShipEncounterIntent.PURSUE ||
            intent === ShipEncounterIntent.CIRCLE
        ) {
            return intent;
        }

        return null;
    }

    private isCarryOverIntentBlocked(
        candidate: PendingIntentCarryOverCandidate,
        existingGroups: Set<PendingShipIntentGroup> | undefined,
    ) {
        if (!existingGroups || existingGroups.size === 0) {
            return false;
        }

        return existingGroups.has(candidate.group);
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

    async findPlayerEncounterViewById(playerId: string, encounterId: string): Promise<EncounterWorkspaceView | null> {
        const encounter = await this.findOneById(encounterId);
        if (!encounter) {
            return null;
        }

        const player = await this.playerRepository.findOneById(playerId);
        if (!player) {
            return null;
        }

        const aggregate = await this.loadEncounterAggregate(encounterId);
        const movementPreview = this.buildEncounterWorkspaceMovementPreview(encounter);

        return {
            ...encounter.toJSON(),
            projectedTrajectories: movementPreview.projectedTrajectories,
            predictedCrossings: movementPreview.predictedCrossings,
            actionForecasts: this.buildEncounterActionForecasts(aggregate),
            lastTurnRollResults: encounter.lastTurnRollResults ?? [],
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
            const previousShips = this.buildEncounterProjectionShipSnapshots(aggregate);
            aggregate.setPendingIntents(this.deserializePendingTurnIntents(context));
            aggregate.advanceTurn();
            const lastTurnRollResults = this.buildEncounterLastTurnRollResults(aggregate, aggregate.turnNumber);
            const intentResolutions = await aggregate.commitWithPendingIntentResolutions();
            await this.carryOverShipManeuverIntents({
                encounterId: context.encounterId,
                nextTurnNumber: aggregate.turnNumber,
                sourceIntents: context.pendingIntents,
                resolutions: intentResolutions,
            });
            await this.persistEncounterProjection(context.encounterId, aggregate, lastTurnRollResults);
            await this.markTurnResolutionCommitted(context);
            await this.persistPendingIntentResolutions(intentResolutions);
            return {
                encounterId: context.encounterId,
                turnDelta: this.buildEncounterTurnDelta(
                    context.encounterId,
                    aggregate.turnNumber,
                    previousShips,
                    aggregate,
                    lastTurnRollResults,
                ),
            };
        } catch (error) {
            await this.turnAdvanceRequestRepository.updateStatus(requestId, TurnAdvanceRequestStatus.REJECTED);
            this.rethrowEncounterRuleViolation(error);
        }
    }

    private buildEncounterWorkspaceMovementPreview(encounter: EncounterDocument) {
        const ships = encounter.ships
            .map((ship): EncounterMovementPreviewShipInput | null => {
                if (
                    !ship.position ||
                    !ship.direction ||
                    typeof ship.speed !== 'number' ||
                    !ship.ship?._id ||
                    !ship.ship?.name
                ) {
                    return null;
                }

                return {
                    shipId: ship.ship._id.toString(),
                    shipName: ship.ship.name,
                    position: {
                        x: ship.position.x,
                        y: ship.position.y,
                    },
                    direction: ship.direction,
                    speed: ship.speed,
                };
            })
            .filter((ship): ship is EncounterMovementPreviewShipInput => Boolean(ship));

        return buildEncounterMovementPreview({
            center: {
                x: encounter.center.x,
                y: encounter.center.y,
            },
            radius: encounter.radius,
            ships,
        });
    }

    async submitPlayerShipManeuverIntents(player: Player, input: SubmitPlayerShipManeuverIntentsInput) {
        const context = await this.resolvePlayerShipOrderContext(player, input);
        const helmsmanIntent = await this.pendingIntentRepository.create({
            encounterId: input.encounterId,
            turnNumber: context.targetTurnNumber,
            actorId: context.actorId,
            actorType: EncounterActorType.PLAYER,
            shipId: input.shipId,
            intentType: input.helmsmanIntent,
            payload: {},
            status: PendingIntentStatus.PENDING,
        });
        await this.pendingIntentRepository.supersedeOtherShipIntentsByType(
            input.encounterId,
            context.targetTurnNumber,
            input.shipId,
            helmsmanIntent._id.toString(),
            [...HELMSMAN_PENDING_SHIP_INTENT_TYPES],
        );

        const boatswainIntent = await this.pendingIntentRepository.create({
            encounterId: input.encounterId,
            turnNumber: context.targetTurnNumber,
            actorId: context.actorId,
            actorType: EncounterActorType.PLAYER,
            shipId: input.shipId,
            intentType: input.boatswainIntent,
            payload: {},
            status: PendingIntentStatus.PENDING,
        });
        await this.pendingIntentRepository.supersedeOtherShipIntentsByType(
            input.encounterId,
            context.targetTurnNumber,
            input.shipId,
            boatswainIntent._id.toString(),
            [...BOATSWAIN_PENDING_SHIP_INTENT_TYPES],
        );

        return [helmsmanIntent, boatswainIntent];
    }

    async submitPlayerShipCaptainIntent(player: Player, input: SubmitPlayerShipCaptainIntentInput) {
        const context = await this.resolvePlayerShipOrderContext(player, input);
        const intentType = resolveCaptainPendingShipIntentType(input.captainIntent);
        const captainIntent = await this.pendingIntentRepository.create({
            encounterId: input.encounterId,
            turnNumber: context.targetTurnNumber,
            actorId: context.actorId,
            actorType: EncounterActorType.PLAYER,
            shipId: input.shipId,
            intentType,
            payload: {},
            status: PendingIntentStatus.PENDING,
        });

        await this.pendingIntentRepository.supersedeOtherShipIntentsByType(
            input.encounterId,
            context.targetTurnNumber,
            input.shipId,
            captainIntent._id.toString(),
            [...CAPTAIN_PENDING_SHIP_INTENT_TYPES],
        );

        return captainIntent;
    }

    async setPlayerShipCaptainTarget(
        player: Player,
        input: SetPlayerShipCaptainTargetInput,
    ): Promise<SubmitPlayerShipTargetResult> {
        const context = await this.resolvePlayerShipOrderContext(player, input);
        const nextTarget = this.resolveValidatedShipCaptainTarget(
            context.aggregate,
            input.shipId,
            input.targetType,
            input.targetShipId,
        );
        context.aggregate.setShipCaptainTarget(input.shipId, nextTarget);
        await context.aggregate.commit();
        await this.persistEncounterProjectionWithCurrentRollResults(input.encounterId, context.aggregate);

        return {
            shipId: input.shipId,
            target: nextTarget,
            actionForecasts: this.buildEncounterActionForecastsForShip(context.aggregate, input.shipId),
        };
    }

    private async resolvePlayerShipOrderContext(
        player: Player,
        input: Pick<SubmitPlayerShipManeuverIntentsInput, 'encounterId' | 'shipId'>,
    ): Promise<SubmitPlayerShipOrderContext> {
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

        return {
            encounter,
            aggregate,
            targetTurnNumber,
            actorId: player._id.toString(),
        };
    }

    private resolveValidatedShipCaptainTarget(
        aggregate: EncounterAggregate,
        shipId: string,
        targetType: ShipCaptainTargetType,
        targetShipId: string | null,
    ): ShipCaptainTarget {
        if (targetType !== ShipCaptainTargetType.SPECIFIC_SHIP) {
            return createShipCaptainTarget(targetType);
        }

        const normalizedTargetShipId = targetShipId?.trim() ?? null;
        if (!normalizedTargetShipId) {
            throw new BadRequestException('Specific ship target requires targetShipId');
        }
        if (normalizedTargetShipId === shipId) {
            throw new BadRequestException('Ship cannot target itself');
        }
        if (!aggregate.ships.some((ship) => ship.shipId === normalizedTargetShipId)) {
            throw new NotFoundException(
                `Target ship ${normalizedTargetShipId} is not present in encounter ${aggregate.id}`,
            );
        }

        return createShipCaptainTarget(ShipCaptainTargetType.SPECIFIC_SHIP, normalizedTargetShipId);
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

        await this.pendingIntentRepository.supersedeOtherShipIntentsByType(
            encounterId,
            aggregate.turnNumber,
            shipId,
            queuedIntent._id.toString(),
            [PendingShipIntentType.SPAWN],
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
        const savedEncounter = await this.persistEncounterProjection(encounter._id.toString(), aggregate, []);

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
        return this.persistEncounterProjection(encounter._id.toString(), aggregate, []);
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
