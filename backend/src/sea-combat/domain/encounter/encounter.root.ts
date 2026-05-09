import { AggregateRoot, AggregateRootName, ApplyEvent } from '@event-nest/core';
import { WindroseEntity } from './entities/windrose.entity';
import { bindChildActions } from '../../../utils/child-action.decorator';
import { Action } from '../../../utils/event-action.decorator';
import {
    EncounterCenterMovedEvent,
    EncounterRadiusAdjustedEvent,
    EncounterTurnEndedEvent,
    EncounterTurnAdvancedEvent,
    EncounterTurnStartedEvent,
} from './events/encounter.events';
import { ShipEntity } from '../../__entities/ship.entity';
import { ShipToEncounterEntity } from './entities/ship-to-encounter.entity';
import {
    ShipAcceleratedEvent,
    ShipDeceleratedEvent,
    ShipIntentChangedEvent,
    ShipMovedEvent,
    ShipPlacementUpdatedEvent,
    ShipRemovedEvent,
    ShipTargetChangedEvent,
    ShipSpawnedEvent,
    ShipTurnEndedEvent,
    ShipTurnStartedEvent,
    ShipTurnedLeftEvent,
    ShipTurnedRightEvent,
} from './events/ship.events';
import { getActionEvent, isReplayingAction } from '../../../utils/action-event';
import { AllDirections, Direction, DirectionTurnLeft, DirectionTurnRight } from '../../types/direction.type';
import {
    PendingIntentStatus,
    isCaptainPendingShipIntentType,
    PendingShipBoatswainIntentType,
    PendingShipHelmsmanIntentType,
    PendingShipIntentType,
    isBoatswainPendingShipIntentType,
    isHelmsmanPendingShipIntentType,
} from '../../types/pending-intent.type';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';
import { ShipCaptainTarget } from '../../types/ship-captain-target.type';
import { Roll3d6UnderWithCritResult, roll3d6UnderWithCrit } from '../../../rps/utils/roll';
import type { AxialPoint } from '../../utils/hex-coordinate.util';
import { distanceBetweenAxialPoints, moveAxialPosition, stepAxialPosition } from '../../utils/hex-coordinate.util';
import { buildEncounterMovementTimeline } from '../../utils/encounter-movement-timeline.util';
import { deriveCaptainShipOrders } from '../../utils/captain-intent.util';
import { roll3d6UnderWithAddressedEntropy } from '../../utils/turn-resolution.util';
import {
    EncounterPendingIntent,
    EncounterPendingIntentResolution,
    EncounterPendingShipManeuverGroup,
    EncounterPendingShipManeuverIntent,
    EncounterPendingSpawnIntentOrderEntry,
    EncounterShipSpawnRandomness,
    PendingEncounterShipCaptainIntent,
    PendingEncounterShipBoatswainIntent,
    PendingEncounterShipHelmsmanIntent,
    PendingEncounterShipSpawnIntent,
} from './types/encounter-pending-intent.type';
import { EncounterRuleViolationError } from './errors/encounter-rule-violation.error';
import {
    ModifierAddedEvent,
    ModifierBucketClearedEvent,
    ModifierBucketTurnStartedEvent,
} from './events/modifier-bucket.events';
import { ShipSkillsEntity } from '../../__entities/ship-skills.entity';

type SpawnTacticsOutcome = 'critSuccess' | 'success' | 'failure' | 'critFailure';
type ShipSpawnPlacementOptions = {
    intent: ShipEncounterIntent;
    tacticsRoll: ReturnType<typeof roll3d6UnderWithCrit>;
    speed: number;
};
type SpawnCandidate = {
    position: AxialPoint;
    direction: Direction;
    rank: SpawnCandidateRank;
};
type SpawnCandidateRank = {
    intentScore: number;
    windScore: number;
    continuationScore: number;
};
type SpawnCandidateBuildInput = {
    distance: number;
    enemyCenterOfMass: AxialPoint;
    intent: ShipEncounterIntent;
    windFrom: Direction;
};
type SerializedShipEntity = ShipEntity & {
    skills: ShipSkillsEntity;
};
type ShipManeuverResolutionInput = {
    ship: ShipToEncounterEntity;
    captainIntent: PendingEncounterShipCaptainIntent | null;
    helmsmanIntent: PendingEncounterShipHelmsmanIntent | null;
    boatswainIntent: PendingEncounterShipBoatswainIntent | null;
    derivedCaptainOrders: DerivedCaptainShipManeuver | null;
};
type DerivedCaptainShipManeuver = {
    captainIntent: ShipEncounterIntent;
    helmsmanIntentType: PendingShipHelmsmanIntentType;
    boatswainIntentType: PendingShipBoatswainIntentType;
};
type ShipManeuverResolutionResult = {
    resolutions: EncounterPendingIntentResolution[];
};

const TAILWIND_SEAMANSHIP_MODIFIER = 6;
const REAR_SIDE_WIND_SEAMANSHIP_MODIFIER = 2;
const FRONT_SIDE_WIND_SEAMANSHIP_MODIFIER = -2;
const HEADWIND_SEAMANSHIP_MODIFIER = -6;

@AggregateRootName(EncounterAggregate.name)
export class EncounterAggregate extends AggregateRoot {
    readonly windrose: WindroseEntity = new WindroseEntity();
    readonly ships: ShipToEncounterEntity[] = [];
    turnNumber: number = 0;
    radius: number = 0;
    name: string | null = null;
    center: AxialPoint = { q: 0, r: 0 };
    private pendingIntents: EncounterPendingIntent[] = [];
    private pendingIntentResolutions: EncounterPendingIntentResolution[] = [];

    constructor(id: string) {
        super(id);
        this.windrose.setStreamId(`windrose:${id}`);
        bindChildActions(this, this.windrose, 'windrose');
    }

    @Action(EncounterTurnStartedEvent)
    startTurn() {
        if (isReplayingAction(this)) {
            return this;
        }

        const action = getActionEvent(this, EncounterTurnStartedEvent);
        action.setNamedArgs({});
        this.ships.forEach((ship) => ship.startTurn());
        return this;
    }

    @Action(EncounterTurnEndedEvent)
    endTurn() {
        if (isReplayingAction(this)) {
            return this;
        }

        const action = getActionEvent(this, EncounterTurnEndedEvent);
        action.setNamedArgs({});
        this.ships.forEach((ship) => ship.endTurn());
        return this;
    }

    @Action(EncounterTurnAdvancedEvent)
    advanceTurn() {
        const advancingFromTurnNumber = this.turnNumber;
        this.assertCanAdvanceTurn(advancingFromTurnNumber);

        const action = getActionEvent(this, EncounterTurnAdvancedEvent);
        const resolved = action.setNamedArgs({
            turnNumber: advancingFromTurnNumber + 1,
        });
        if (isReplayingAction(this, EncounterTurnAdvancedEvent) && !this.isValidTurnNumber(resolved.turnNumber)) {
            return this;
        }

        this.setTurnNumber(resolved.turnNumber);
        this.startTurn();
        this.resolveShipMovements();
        this.processPendingIntents(advancingFromTurnNumber);
        this.endTurn();
        this.pendingIntents = [];
        return this;
    }

    setPendingIntents(intents: EncounterPendingIntent[]) {
        this.pendingIntents = intents.slice();
        this.pendingIntentResolutions = [];
        return this;
    }

    async commitWithPendingIntentResolutions() {
        await this.commit();
        return this.consumePendingIntentResolutions();
    }

    private consumePendingIntentResolutions() {
        const resolutions = this.pendingIntentResolutions.slice();
        this.pendingIntentResolutions = [];
        return resolutions;
    }

    private isValidTurnNumber(turnNumber: unknown): turnNumber is number {
        return typeof turnNumber === 'number' && Number.isInteger(turnNumber) && turnNumber >= 0;
    }

    setTurnNumber(turnNumber: number) {
        this.turnNumber = Math.max(0, Math.trunc(turnNumber));
        return this;
    }

    assertCanQueueSpawnIntent(hasPendingAdvanceRequest: boolean) {
        if (!this.isDeploymentTurn()) {
            throw new EncounterRuleViolationError(
                `Ship spawn intents are only allowed during deployment turn 0 in encounter ${this.id}`,
            );
        }
        if (hasPendingAdvanceRequest) {
            throw new EncounterRuleViolationError(
                `Deployment turn 0 for encounter ${this.id} is already being advanced`,
            );
        }
        return this;
    }

    setRadius(radius: number) {
        this.radius = radius;
        return this;
    }

    setName(name: string | null) {
        this.name = name;
        return this;
    }

    setCenter(center: AxialPoint) {
        this.center = center;
        return this;
    }

    @Action(EncounterRadiusAdjustedEvent)
    adjustRadius(radius: number) {
        const action = getActionEvent(this, EncounterRadiusAdjustedEvent);
        const { radius: nextRadius } = action.setNamedArgs({ radius });
        return this.setRadius(nextRadius);
    }

    @Action(EncounterCenterMovedEvent)
    moveCenter(center: AxialPoint) {
        const action = getActionEvent(this, EncounterCenterMovedEvent);
        const { center: nextCenter } = action.setNamedArgs({ center });
        return this.setCenter(nextCenter);
    }

    reRollWindDirection(direction: Direction) {
        this.windrose.reRollWindDirection(direction);
        return this;
    }

    @Action(ShipSpawnedEvent)
    spawnShip(inputShip: ShipEntity, inputIntent: ShipEncounterIntent, inputRandomness: EncounterShipSpawnRandomness) {
        const action = getActionEvent(this, ShipSpawnedEvent);

        const { ship, intent } = action.setNamedArgs({
            ship: inputShip,
            intent: inputIntent,
        });
        const normalizedShip = this.hydrateShipEntity(ship);
        const { seamanshipRoll, tacticsRoll } = action.setNamedArgs({
            seamanshipRoll: inputRandomness.seamanshipRoll,
            tacticsRoll: inputRandomness.tacticsRoll,
        });
        const { speed } = action.setNamedArgs({
            speed: normalizedShip.resolveStartSpeed(seamanshipRoll),
        });
        const spawn = this.spawnShipAtEncounter({
            intent,
            tacticsRoll,
            speed,
        });
        const { position, direction } = action.setNamedArgs({
            position: spawn.position,
            direction: spawn.direction,
        });

        const shipEntity = Object.assign(new ShipToEncounterEntity(), {
            ship: normalizedShip,
            shipId: normalizedShip.id,
            position,
            intent,
        });
        shipEntity.setActualSpeed(speed).setActualDirection(direction);
        bindChildActions(this, shipEntity, `ship_${shipEntity.shipId ?? this.ships.length}`);
        this.ships.push(shipEntity);
        return this;
    }

    @Action(ShipRemovedEvent)
    removeShip(shipId: string) {
        const action = getActionEvent(this, ShipRemovedEvent);
        const { shipId: removedShipId } = action.setNamedArgs({ shipId });
        const nextShips = this.ships.filter((ship) => ship.shipId !== removedShipId);
        if (nextShips.length === this.ships.length) {
            throw new Error(`Ship ${removedShipId} is not present in encounter ${this.id}`);
        }

        this.ships.length = 0;
        this.ships.push(...nextShips);
        return this;
    }

    @ApplyEvent(ShipTurnStartedEvent)
    applyShipTurnStarted(event: ShipTurnStartedEvent) {
        this.requireShip(event.shipId).startTurn(event);
        return this;
    }

    @ApplyEvent(ShipTurnEndedEvent)
    applyShipTurnEnded(event: ShipTurnEndedEvent) {
        this.requireShip(event.shipId).endTurn(event);
        return this;
    }

    @ApplyEvent(ShipMovedEvent)
    applyShipMoved(event: ShipMovedEvent) {
        this.requireShip(event.shipId).moveTo(event);
        return this;
    }

    @ApplyEvent(ShipIntentChangedEvent)
    applyShipIntentChanged(event: ShipIntentChangedEvent) {
        this.requireShip(event.shipId).setIntent(event);
        return this;
    }

    @ApplyEvent(ShipTargetChangedEvent)
    applyShipTargetChanged(event: ShipTargetChangedEvent) {
        this.requireShip(event.shipId).setTarget(event);
        return this;
    }

    @ApplyEvent(ShipPlacementUpdatedEvent)
    applyShipPlacementUpdated(event: ShipPlacementUpdatedEvent) {
        this.requireShip(event.shipId).updatePlacement(event);
        return this;
    }

    @ApplyEvent(ShipAcceleratedEvent)
    applyShipAccelerated(event: ShipAcceleratedEvent) {
        this.requireShip(event.shipId).accelerate(event);
        return this;
    }

    @ApplyEvent(ShipDeceleratedEvent)
    applyShipDecelerated(event: ShipDeceleratedEvent) {
        this.requireShip(event.shipId).decelerate(event);
        return this;
    }

    @ApplyEvent(ShipTurnedRightEvent)
    applyShipTurnedRight(event: ShipTurnedRightEvent) {
        this.requireShip(event.shipId).turnRight(event);
        return this;
    }

    @ApplyEvent(ShipTurnedLeftEvent)
    applyShipTurnedLeft(event: ShipTurnedLeftEvent) {
        this.requireShip(event.shipId).turnLeft(event);
        return this;
    }

    @ApplyEvent(ModifierAddedEvent)
    applyModifierAdded(event: ModifierAddedEvent) {
        this.requireShip(event.shipId).modifierBucket.addModifier(event);
        return this;
    }

    @ApplyEvent(ModifierBucketTurnStartedEvent)
    applyModifierBucketTurnStarted(event: ModifierBucketTurnStartedEvent) {
        this.requireShip(event.shipId).modifierBucket.startTurn(event);
        return this;
    }

    @ApplyEvent(ModifierBucketClearedEvent)
    applyModifierBucketCleared(event: ModifierBucketClearedEvent) {
        this.requireShip(event.shipId).modifierBucket.clear(event);
        return this;
    }

    private requireShip(shipId: string): ShipToEncounterEntity {
        const ship = this.ships.find((entry) => entry.shipId === shipId);
        if (!ship) {
            throw new Error(`Ship ${shipId} is not present in encounter ${this.id}`);
        }
        return ship;
    }

    setShipCaptainTarget(shipId: string, target: ShipCaptainTarget) {
        this.requireShip(shipId).setTarget(target);
        return this;
    }

    private hydrateShipEntity(ship: ShipEntity): ShipEntity {
        if (ship instanceof ShipEntity) {
            return ship;
        }

        const serializedShip = ship as SerializedShipEntity;
        return Object.assign(new ShipEntity(), ship, {
            skills: Object.assign(new ShipSkillsEntity(), serializedShip.skills),
        });
    }

    private resolveTacticsOutcome(tacticsRoll: ReturnType<typeof roll3d6UnderWithCrit>): SpawnTacticsOutcome {
        if (tacticsRoll.isCritSuccess) {
            return 'critSuccess';
        }
        if (tacticsRoll.isCritFailure) {
            return 'critFailure';
        }
        return tacticsRoll.mos >= 0 ? 'success' : 'failure';
    }

    private processPendingIntents(advancingFromTurnNumber: number) {
        if (isReplayingAction(this, EncounterTurnAdvancedEvent)) {
            return;
        }

        this.pendingIntentResolutions = [];
        const orderedSpawnIntents = this.buildPendingSpawnIntentOrder();
        const orderedSpawnIntentIds = new Set(orderedSpawnIntents.map((entry) => entry.intent.intentId));
        const spawnResolutions = orderedSpawnIntents.map((entry) => {
            const resolution = this.resolvePendingSpawnIntent(entry.intent, advancingFromTurnNumber);
            return resolution;
        });
        const nonSpawnResolutions = this.resolvePendingShipManeuvers(orderedSpawnIntentIds);

        this.pendingIntentResolutions = [...spawnResolutions, ...nonSpawnResolutions];
    }

    private resolvePendingShipManeuvers(orderedSpawnIntentIds: Set<string>) {
        const groupedManeuvers = this.buildPendingShipManeuverGroups(
            this.pendingIntents
                .filter(
                    (intent): intent is EncounterPendingShipManeuverIntent =>
                        !orderedSpawnIntentIds.has(intent.intentId) &&
                        intent.intentType !== PendingShipIntentType.SPAWN,
                )
                .sort(
                    (left, right) =>
                        left.shipId.localeCompare(right.shipId) || left.intentId.localeCompare(right.intentId),
                ),
        );

        return groupedManeuvers.flatMap((group) => this.resolvePendingShipManeuverGroup(group));
    }

    private buildPendingShipManeuverGroups(
        intents: EncounterPendingShipManeuverIntent[],
    ): EncounterPendingShipManeuverGroup[] {
        const groups = new Map<string, EncounterPendingShipManeuverGroup>();
        intents.forEach((intent) => {
            let group = groups.get(intent.shipId);
            if (!group) {
                group = {
                    shipId: intent.shipId,
                    captainIntents: [],
                    helmsmanIntents: [],
                    boatswainIntents: [],
                };
                groups.set(intent.shipId, group);
            }

            if (isCaptainPendingShipIntentType(intent.intentType)) {
                group.captainIntents.push(intent as PendingEncounterShipCaptainIntent);
                return;
            }

            if (isHelmsmanPendingShipIntentType(intent.intentType)) {
                group.helmsmanIntents.push(intent as PendingEncounterShipHelmsmanIntent);
                return;
            }

            if (isBoatswainPendingShipIntentType(intent.intentType)) {
                group.boatswainIntents.push(intent as PendingEncounterShipBoatswainIntent);
            }
        });

        return Array.from(groups.values()).sort((left, right) => left.shipId.localeCompare(right.shipId));
    }

    private resolvePendingShipManeuverGroup(group: EncounterPendingShipManeuverGroup) {
        const duplicateResolutions = [
            ...group.captainIntents
                .slice(0, -1)
                .map((intent) =>
                    this.buildRejectedIntentResolution(
                        intent.intentId,
                        `Ship ${group.shipId} has multiple pending captain intents for the same turn`,
                    ),
                ),
            ...group.helmsmanIntents
                .slice(0, -1)
                .map((intent) =>
                    this.buildRejectedIntentResolution(
                        intent.intentId,
                        `Ship ${group.shipId} has multiple pending helmsman intents for the same turn`,
                    ),
                ),
            ...group.boatswainIntents
                .slice(0, -1)
                .map((intent) =>
                    this.buildRejectedIntentResolution(
                        intent.intentId,
                        `Ship ${group.shipId} has multiple pending boatswain intents for the same turn`,
                    ),
                ),
        ];
        const captainIntent = group.captainIntents.at(-1) ?? null;
        const helmsmanIntent = group.helmsmanIntents.at(-1) ?? null;
        const boatswainIntent = group.boatswainIntents.at(-1) ?? null;
        const ship = this.ships.find((entry) => entry.shipId === group.shipId);

        if (!ship) {
            return [
                ...duplicateResolutions,
                ...this.buildMissingShipIntentResolutions(captainIntent, helmsmanIntent, boatswainIntent, group.shipId),
            ];
        }

        const effectiveCaptainTactic = captainIntent?.captainIntent ?? ship.intent ?? null;
        const derivedCaptainOrders = effectiveCaptainTactic
            ? this.deriveCaptainShipManeuver(ship, effectiveCaptainTactic)
            : null;

        return [
            ...duplicateResolutions,
            ...this.resolveShipManeuver({
                ship,
                captainIntent,
                helmsmanIntent,
                boatswainIntent,
                derivedCaptainOrders,
            }).resolutions,
        ];
    }

    private buildPendingSpawnIntentOrder(): EncounterPendingSpawnIntentOrderEntry[] {
        return this.pendingIntents
            .filter(
                (intent): intent is PendingEncounterShipSpawnIntent =>
                    intent.intentType === PendingShipIntentType.SPAWN,
            )
            .map((intent) => ({
                intent,
                tacticsRoll: this.resolvePendingIntentRoll(intent, 'spawn-tactics', 0, intent.ship.skills.tactics),
            }))
            .sort((left, right) => this.compareSpawnIntentInitiative(left, right));
    }

    private compareSpawnIntentInitiative(
        left: EncounterPendingSpawnIntentOrderEntry,
        right: EncounterPendingSpawnIntentOrderEntry,
    ) {
        const outcomeDifference =
            this.spawnInitiativeOutcomeRank(left.tacticsRoll) - this.spawnInitiativeOutcomeRank(right.tacticsRoll);
        if (outcomeDifference !== 0) {
            return outcomeDifference;
        }

        const mosDifference = left.tacticsRoll.mos - right.tacticsRoll.mos;
        if (mosDifference !== 0) {
            return mosDifference;
        }

        return left.intent.shipId.localeCompare(right.intent.shipId);
    }

    private spawnInitiativeOutcomeRank(roll: Roll3d6UnderWithCritResult) {
        if (roll.isCritFailure) {
            return 0;
        }
        if (roll.mos < 0) {
            return 1;
        }
        if (roll.isCritSuccess) {
            return 3;
        }
        return 2;
    }

    private isDeploymentTurn(turnNumber: number = this.turnNumber) {
        return turnNumber === 0;
    }

    private assertCanAdvanceTurn(advancingFromTurnNumber: number) {
        if (isReplayingAction(this, EncounterTurnAdvancedEvent)) {
            return;
        }

        if (!this.isDeploymentTurn(advancingFromTurnNumber)) {
            return;
        }

        const spawnIntentCount = this.pendingIntents.filter(
            (intent) => intent.intentType === PendingShipIntentType.SPAWN,
        ).length;
        if (spawnIntentCount >= 2) {
            return;
        }

        throw new EncounterRuleViolationError(
            `Encounter ${this.id} cannot start turn 1 with fewer than two pending ship spawns`,
        );
    }

    private resolvePendingSpawnIntent(
        intent: PendingEncounterShipSpawnIntent,
        advancingFromTurnNumber: number,
    ): EncounterPendingIntentResolution {
        if (!this.isDeploymentTurn(advancingFromTurnNumber)) {
            return this.buildRejectedIntentResolution(
                intent.intentId,
                `Ship spawn intent ${intent.intentId} is only valid during deployment turn 0`,
            );
        }

        if (this.ships.some((entry) => entry.shipId === intent.shipId)) {
            return this.buildRejectedIntentResolution(
                intent.intentId,
                `Ship ${intent.shipId} is already spawned in encounter ${this.id}`,
            );
        }

        const seamanshipRoll = this.resolvePendingIntentRoll(
            intent,
            'spawn-seamanship',
            0,
            intent.ship.skills.seamanship,
        );
        const tacticsRoll = this.resolvePendingIntentRoll(intent, 'spawn-tactics', 0, intent.ship.skills.tactics);

        this.spawnShip(intent.ship, intent.encounterIntent, {
            seamanshipRoll,
            tacticsRoll,
        });

        if (!this.ships.find((entry) => entry.shipId === intent.shipId)) {
            throw new Error(`Failed to materialize spawned ship ${intent.shipId} in encounter ${this.id}`);
        }

        return this.buildConsumedIntentResolution(intent.intentId);
    }

    private resolveShipManeuver(input: ShipManeuverResolutionInput): ShipManeuverResolutionResult {
        const helmsmanIntentType =
            this.resolveEffectiveHelmsmanIntentType(input.helmsmanIntent, input.derivedCaptainOrders) ??
            input.derivedCaptainOrders?.helmsmanIntentType ??
            PendingShipIntentType.HELMSMAN_FORWARD;
        const boatswainIntentType = this.normalizeBoatswainIntentTypeForManeuver(
            helmsmanIntentType,
            this.resolveEffectiveBoatswainIntentType(input.boatswainIntent, input.derivedCaptainOrders) ??
                input.derivedCaptainOrders?.boatswainIntentType ??
                PendingShipIntentType.BOATSWAIN_HOLD,
        );
        const rollIntent = input.boatswainIntent ?? input.helmsmanIntent ?? input.captainIntent;

        if (input.captainIntent) {
            if (input.ship.intent !== input.captainIntent.captainIntent) {
                input.ship.setIntent(input.captainIntent.captainIntent);
            }
        }

        if (this.isTurningHelmsmanIntentType(helmsmanIntentType) && input.ship.actualSpeed < 1) {
            return {
                resolutions: this.buildResolvedShipManeuverIntents(
                    input,
                    PendingIntentStatus.REJECTED,
                    `Ship ${input.ship.shipId} must have speed at least 1 to turn`,
                ),
            };
        }

        if (helmsmanIntentType === PendingShipIntentType.HELMSMAN_FORWARD) {
            if (boatswainIntentType === PendingShipIntentType.BOATSWAIN_ACCELERATE) {
                input.ship.accelerate(
                    this.resolveShipManeuverRoll(
                        input.ship,
                        rollIntent,
                        'boatswain-accelerate',
                        this.resolveShipSeamanshipTarget(input.ship, this.resolveWindSeamanshipModifier(input.ship)),
                    ),
                );
            }

            if (boatswainIntentType === PendingShipIntentType.BOATSWAIN_DECELERATE) {
                input.ship.decelerate(
                    this.resolveShipManeuverRoll(
                        input.ship,
                        rollIntent,
                        'boatswain-decelerate',
                        this.resolveShipSeamanshipTarget(input.ship, -this.resolveWindSeamanshipModifier(input.ship)),
                    ),
                );
            }

            return {
                resolutions: this.buildResolvedShipManeuverIntents(input, PendingIntentStatus.CONSUMED),
            };
        }

        if (helmsmanIntentType === PendingShipIntentType.HELMSMAN_TURN_LEFT) {
            if (boatswainIntentType === PendingShipIntentType.BOATSWAIN_ACCELERATE) {
                input.ship.turnLeft(
                    this.resolveShipManeuverRoll(
                        input.ship,
                        rollIntent,
                        'helmsman-turn-left-keep-speed',
                        this.resolveShipSeamanshipTarget(input.ship, this.resolveWindSeamanshipModifier(input.ship)),
                    ),
                );
            } else {
                input.ship.turnLeft();
            }

            return {
                resolutions: this.buildResolvedShipManeuverIntents(input, PendingIntentStatus.CONSUMED),
            };
        }

        if (helmsmanIntentType === PendingShipIntentType.HELMSMAN_TURN_RIGHT) {
            if (boatswainIntentType === PendingShipIntentType.BOATSWAIN_ACCELERATE) {
                input.ship.turnRight(
                    this.resolveShipManeuverRoll(
                        input.ship,
                        rollIntent,
                        'helmsman-turn-right-keep-speed',
                        this.resolveShipSeamanshipTarget(input.ship, this.resolveWindSeamanshipModifier(input.ship)),
                    ),
                );
            } else {
                input.ship.turnRight();
            }

            return {
                resolutions: this.buildResolvedShipManeuverIntents(input, PendingIntentStatus.CONSUMED),
            };
        }

        return {
            resolutions: this.buildResolvedShipManeuverIntents(
                input,
                PendingIntentStatus.REJECTED,
                `Unsupported intent type ${helmsmanIntentType}/${boatswainIntentType}`,
            ),
        };
    }

    private buildResolvedShipManeuverIntents(
        input: ShipManeuverResolutionInput,
        status: PendingIntentStatus,
        resolutionReason?: string,
    ) {
        return [input.captainIntent, input.helmsmanIntent, input.boatswainIntent]
            .filter((intent): intent is EncounterPendingShipManeuverIntent => Boolean(intent))
            .map((intent) =>
                status === PendingIntentStatus.CONSUMED
                    ? this.buildConsumedIntentResolution(intent.intentId)
                    : this.buildRejectedIntentResolution(intent.intentId, resolutionReason ?? 'Intent rejected'),
            );
    }

    private resolveShipManeuverRoll(
        ship: ShipToEncounterEntity,
        intent: EncounterPendingShipManeuverIntent | null,
        purpose: string,
        target: number,
    ) {
        if (!intent) {
            throw new Error(`Ship ${ship.shipId} is missing the intent needed for maneuver roll ${purpose}`);
        }

        return this.resolvePendingIntentRoll(intent, purpose, 0, target);
    }

    private resolveShipSeamanshipTarget(ship: ShipToEncounterEntity, windModifier: number) {
        return ship.ship.skills.seamanship + ship.modifierBucket.total('seamanship') + windModifier;
    }

    private resolveWindSeamanshipModifier(ship: ShipToEncounterEntity) {
        const bowIndex = AllDirections.indexOf(ship.actualDirection);
        const windIndex = AllDirections.indexOf(this.windrose.direction);
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

    private isTurningHelmsmanIntentType(intentType: PendingShipHelmsmanIntentType) {
        return (
            intentType === PendingShipIntentType.HELMSMAN_TURN_LEFT ||
            intentType === PendingShipIntentType.HELMSMAN_TURN_RIGHT
        );
    }

    private normalizeBoatswainIntentTypeForManeuver(
        helmsmanIntentType: PendingShipHelmsmanIntentType,
        boatswainIntentType:
            | PendingShipIntentType.BOATSWAIN_OBEY_CAPTAIN
            | PendingShipIntentType.BOATSWAIN_HOLD
            | PendingShipIntentType.BOATSWAIN_ACCELERATE
            | PendingShipIntentType.BOATSWAIN_DECELERATE,
    ) {
        if (
            this.isTurningHelmsmanIntentType(helmsmanIntentType) &&
            boatswainIntentType === PendingShipIntentType.BOATSWAIN_DECELERATE
        ) {
            return PendingShipIntentType.BOATSWAIN_ACCELERATE;
        }

        return boatswainIntentType;
    }

    private deriveCaptainShipManeuver(
        ship: ShipToEncounterEntity,
        captainIntent: ShipEncounterIntent,
    ): DerivedCaptainShipManeuver {
        const otherShips = this.ships
            .filter((entry) => entry.shipId !== ship.shipId)
            .map((entry) => ({
                shipId: entry.shipId,
                position: entry.position,
                direction: entry.actualDirection,
                speed: entry.actualSpeed,
            }));
        const derivedOrders = deriveCaptainShipOrders({
            captainIntent,
            ship: {
                shipId: ship.shipId,
                position: ship.position,
                direction: ship.actualDirection,
                speed: ship.actualSpeed,
            },
            target: ship.target,
            otherShips,
        });

        return {
            captainIntent,
            helmsmanIntentType: derivedOrders.helmsmanIntent,
            boatswainIntentType: derivedOrders.boatswainIntent,
        };
    }

    private resolveEffectiveHelmsmanIntentType(
        helmsmanIntent: PendingEncounterShipHelmsmanIntent | null,
        derivedCaptainOrders: DerivedCaptainShipManeuver | null,
    ) {
        if (!helmsmanIntent) {
            return derivedCaptainOrders?.helmsmanIntentType ?? null;
        }
        if (helmsmanIntent.intentType === PendingShipIntentType.HELMSMAN_OBEY_CAPTAIN) {
            return derivedCaptainOrders?.helmsmanIntentType ?? PendingShipIntentType.HELMSMAN_FORWARD;
        }

        return helmsmanIntent.intentType;
    }

    private resolveEffectiveBoatswainIntentType(
        boatswainIntent: PendingEncounterShipBoatswainIntent | null,
        derivedCaptainOrders: DerivedCaptainShipManeuver | null,
    ) {
        if (!boatswainIntent) {
            return derivedCaptainOrders?.boatswainIntentType ?? null;
        }
        if (boatswainIntent.intentType === PendingShipIntentType.BOATSWAIN_OBEY_CAPTAIN) {
            return derivedCaptainOrders?.boatswainIntentType ?? PendingShipIntentType.BOATSWAIN_HOLD;
        }

        return boatswainIntent.intentType;
    }

    private buildMissingShipIntentResolutions(
        captainIntent: PendingEncounterShipCaptainIntent | null,
        helmsmanIntent: PendingEncounterShipHelmsmanIntent | null,
        boatswainIntent: PendingEncounterShipBoatswainIntent | null,
        shipId: string,
    ) {
        return [captainIntent, helmsmanIntent, boatswainIntent]
            .filter((intent): intent is EncounterPendingShipManeuverIntent => Boolean(intent))
            .map((intent) =>
                this.buildRejectedIntentResolution(
                    intent.intentId,
                    `Ship ${shipId} is not available in encounter ${this.id}`,
                ),
            );
    }

    private buildConsumedIntentResolution(intentId: string): EncounterPendingIntentResolution {
        return {
            intentId,
            status: PendingIntentStatus.CONSUMED,
        };
    }

    private buildRejectedIntentResolution(
        intentId: string,
        resolutionReason: string,
    ): EncounterPendingIntentResolution {
        return {
            intentId,
            status: PendingIntentStatus.REJECTED,
            resolutionReason,
        };
    }

    private resolvePendingIntentRoll(
        intent: EncounterPendingIntent,
        purpose: string,
        index: number,
        target: number,
    ): Roll3d6UnderWithCritResult {
        return roll3d6UnderWithAddressedEntropy(
            intent.randomness.taskSeed,
            {
                purpose,
                index,
                scope: {
                    taskSignatureHash: intent.randomness.taskSignatureHash,
                    intentId: intent.intentId,
                    shipId: intent.shipId,
                },
            },
            target,
        );
    }

    private spawnShipAtEncounter(options: ShipSpawnPlacementOptions) {
        if (!options.intent) {
            throw new Error('Ship encounter intent is required for spawn resolution');
        }

        const distance = this.resolveSpawnDistance(options.speed);
        const windFrom = this.windrose.direction;
        const tacticsOutcome = this.resolveTacticsOutcome(options.tacticsRoll);
        const enemyCenterOfMass = this.resolveEnemyCenterOfMass();
        const candidates = this.buildSpawnCandidates({
            distance,
            enemyCenterOfMass,
            intent: options.intent,
            windFrom,
        });

        if (candidates.length === 0) {
            throw new Error(`No spawn candidates available for encounter intent ${options.intent}`);
        }

        return this.selectSpawnCandidate(candidates, tacticsOutcome);
    }

    private resolveSpawnDistance(speed: number) {
        const safeDistance = Math.max(0, this.radius - speed);
        const cappedDistance = this.radius > 0 ? Math.max(1, Math.floor(this.radius * 0.75)) : 0;

        return Math.min(safeDistance, cappedDistance);
    }

    private turnLeft(direction: Direction, times: number = 1) {
        let current = direction;
        for (let i = 0; i < times; i++) {
            current = DirectionTurnLeft[current];
        }
        return current;
    }

    private turnRight(direction: Direction, times: number = 1) {
        let current = direction;
        for (let i = 0; i < times; i++) {
            current = DirectionTurnRight[current];
        }
        return current;
    }

    private oppositeDirection(direction: Direction) {
        return this.turnLeft(direction, 3);
    }

    private windRelationRank(heading: Direction, windFrom: Direction) {
        const tailwind = this.oppositeDirection(windFrom);
        if (heading === tailwind) return 3;
        if (heading === this.turnLeft(tailwind) || heading === this.turnRight(tailwind)) return 2;
        if (heading === this.turnLeft(windFrom) || heading === this.turnRight(windFrom)) return 1;
        return 0;
    }

    private resolveEnemyCenterOfMass(): AxialPoint {
        if (this.ships.length === 0) {
            return { ...this.center };
        }

        const total = this.ships.reduce(
            (accumulator, ship) => ({
                q: accumulator.q + ship.position.q,
                r: accumulator.r + ship.position.r,
            }),
            { q: 0, r: 0 },
        );

        return {
            q: total.q / this.ships.length,
            r: total.r / this.ships.length,
        };
    }

    private buildSpawnCandidates(input: SpawnCandidateBuildInput): SpawnCandidate[] {
        if (input.intent === ShipEncounterIntent.FLEE) {
            return AllDirections.map((direction) => {
                const position = moveAxialPosition(this.center, direction, input.distance);
                return this.createSpawnCandidate(position, direction, input);
            });
        }

        if (input.intent === ShipEncounterIntent.PURSUE) {
            return AllDirections.map((direction) => {
                const position = moveAxialPosition(this.center, this.oppositeDirection(direction), input.distance);
                return this.createSpawnCandidate(position, direction, input);
            });
        }

        if (input.intent === ShipEncounterIntent.CIRCLE) {
            return AllDirections.flatMap((radial) => {
                const position = moveAxialPosition(this.center, radial, input.distance);
                return [
                    this.createSpawnCandidate(position, this.turnLeft(radial), input),
                    this.createSpawnCandidate(position, this.turnRight(radial), input),
                ];
            });
        }

        throw new Error(`Unsupported ship encounter intent: ${input.intent}`);
    }

    private createSpawnCandidate(
        position: AxialPoint,
        direction: Direction,
        input: SpawnCandidateBuildInput,
    ): SpawnCandidate {
        return {
            position,
            direction,
            rank: this.rankSpawnCandidate(position, direction, input),
        };
    }

    private rankSpawnCandidate(
        position: AxialPoint,
        direction: Direction,
        input: SpawnCandidateBuildInput,
    ): SpawnCandidateRank {
        const currentDistance = distanceBetweenAxialPoints(position, input.enemyCenterOfMass);
        const nextPosition = stepAxialPosition(position, direction);
        const nextDistance = distanceBetweenAxialPoints(nextPosition, input.enemyCenterOfMass);
        const distanceDelta = nextDistance - currentDistance;
        const windScore = this.windRelationRank(direction, input.windFrom);

        switch (input.intent) {
            case ShipEncounterIntent.FLEE:
                return {
                    intentScore: this.normalizeSpawnScore(distanceDelta),
                    windScore,
                    continuationScore: this.normalizeSpawnScore(currentDistance),
                };
            case ShipEncounterIntent.PURSUE:
                return {
                    intentScore: this.normalizeSpawnScore(currentDistance - nextDistance),
                    windScore,
                    continuationScore: this.normalizeSpawnScore(-currentDistance),
                };
            case ShipEncounterIntent.CIRCLE:
                return {
                    intentScore: this.normalizeSpawnScore(-Math.abs(distanceDelta)),
                    windScore,
                    continuationScore: this.normalizeSpawnScore(currentDistance),
                };
            default:
                throw new Error(`Unsupported ship encounter intent: ${input.intent}`);
        }
    }

    private normalizeSpawnScore(value: number) {
        return Math.round(value * 1000);
    }

    private compareSpawnCandidates(left: SpawnCandidate, right: SpawnCandidate) {
        const intentDifference = right.rank.intentScore - left.rank.intentScore;
        if (intentDifference !== 0) {
            return intentDifference;
        }

        const windDifference = right.rank.windScore - left.rank.windScore;
        if (windDifference !== 0) {
            return windDifference;
        }

        const continuationDifference = right.rank.continuationScore - left.rank.continuationScore;
        if (continuationDifference !== 0) {
            return continuationDifference;
        }

        const directionDifference = AllDirections.indexOf(left.direction) - AllDirections.indexOf(right.direction);
        if (directionDifference !== 0) {
            return directionDifference;
        }

        const qDifference = left.position.q - right.position.q;
        if (qDifference !== 0) {
            return qDifference;
        }

        return left.position.r - right.position.r;
    }

    private selectSpawnCandidate(candidates: SpawnCandidate[], outcome: SpawnTacticsOutcome) {
        const sortedCandidates = candidates.slice().sort((left, right) => this.compareSpawnCandidates(left, right));
        const lastIndex = sortedCandidates.length - 1;

        if (outcome === 'critSuccess') {
            return sortedCandidates[0];
        }

        if (outcome === 'success') {
            return sortedCandidates[Math.min(1, lastIndex)];
        }

        if (outcome === 'failure') {
            return sortedCandidates[Math.max(lastIndex - 1, 0)];
        }

        return sortedCandidates[lastIndex];
    }

    private resolveShipMovements() {
        if (isReplayingAction(this, EncounterTurnAdvancedEvent)) {
            return;
        }

        if (this.ships.length === 0) {
            return;
        }

        const movementTimeline = buildEncounterMovementTimeline({
            center: this.center,
            radius: this.radius,
            ships: this.ships.map((ship) => ({
                shipId: ship.shipId,
                position: ship.position,
                direction: ship.actualDirection,
                speed: ship.actualSpeed,
            })),
        });

        const finalPositionsByShipId = new Map(movementTimeline.ships.map((ship) => [ship.shipId, ship.finalPosition]));

        this.ships.forEach((ship) => {
            const finalPosition = finalPositionsByShipId.get(ship.shipId) ?? ship.position;
            ship.moveTo(finalPosition);
        });
    }
}
