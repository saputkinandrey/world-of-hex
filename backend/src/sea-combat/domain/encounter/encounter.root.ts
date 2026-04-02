import { AggregateRoot, AggregateRootName } from '@event-nest/core';
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
import { ShipRemovedEvent, ShipSpawnedEvent } from './events/ship.events';
import { getActionEvent } from '../../../utils/action-event';
import { AllDirections, Direction, DirectionTurnLeft, DirectionTurnRight } from '../../types/direction.type';
import { PendingIntentStatus, PendingShipIntentType } from '../../types/pending-intent.type';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';
import { Roll3d6UnderWithCritResult, roll3d6UnderWithCrit } from '../../../rps/utils/roll';
import type { AxialPoint } from '../../utils/hex-coordinate.util';
import { distanceBetweenAxialPoints, moveAxialPosition, stepAxialPosition } from '../../utils/hex-coordinate.util';
import { roll3d6UnderWithAddressedEntropy } from '../../utils/turn-resolution.util';
import {
    EncounterPendingIntent,
    EncounterPendingIntentResolution,
    EncounterPendingSpawnIntentOrderEntry,
    EncounterShipSpawnRandomness,
    PendingEncounterShipSpawnIntent,
} from './types/encounter-pending-intent.type';
import { EncounterRuleViolationError } from './errors/encounter-rule-violation.error';

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
type ShipTurnPath = {
    ship: ShipToEncounterEntity;
    path: AxialPoint[];
    currentStep: number;
    hasCollided: boolean;
};

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
        const action = getActionEvent(this, EncounterTurnStartedEvent);
        action.setNamedArgs({});
        this.ships.forEach((ship) => ship.startTurn());
        return this;
    }

    @Action(EncounterTurnEndedEvent)
    endTurn() {
        const action = getActionEvent(this, EncounterTurnEndedEvent);
        action.setNamedArgs({});
        this.ships.forEach((ship) => ship.endTurn());
        return this;
    }

    @Action(EncounterTurnAdvancedEvent)
    advanceTurn() {
        const action = getActionEvent(this, EncounterTurnAdvancedEvent);
        const resolved = action.setNamedArgs({
            turnNumber: this.turnNumber + 1,
        });
        this.assertCanAdvanceTurn();
        this.startTurn();
        this.resolveShipMovements();
        this.processPendingIntents();
        this.endTurn();
        this.pendingIntents = [];
        return this.setTurnNumber(resolved.turnNumber);
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
        const { seamanshipRoll, tacticsRoll } = action.setNamedArgs({
            seamanshipRoll: inputRandomness.seamanshipRoll,
            tacticsRoll: inputRandomness.tacticsRoll,
        });
        const { speed } = action.setNamedArgs({
            speed: ship.resolveStartSpeed(seamanshipRoll),
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
            ship,
            shipId: ship.id,
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

    private resolveTacticsOutcome(tacticsRoll: ReturnType<typeof roll3d6UnderWithCrit>): SpawnTacticsOutcome {
        if (tacticsRoll.isCritSuccess) {
            return 'critSuccess';
        }
        if (tacticsRoll.isCritFailure) {
            return 'critFailure';
        }
        return tacticsRoll.mos >= 0 ? 'success' : 'failure';
    }

    private processPendingIntents() {
        this.pendingIntentResolutions = [];
        const orderedSpawnIntents = this.buildPendingSpawnIntentOrder();
        const orderedSpawnIntentIds = new Set(orderedSpawnIntents.map((entry) => entry.intent.intentId));
        const spawnedActorIds = new Set<string>();
        const spawnResolutions = orderedSpawnIntents.map((entry) => {
            if (spawnedActorIds.has(entry.intent.actorId)) {
                return {
                    intentId: entry.intent.intentId,
                    status: PendingIntentStatus.REJECTED,
                    resolutionReason: `Actor ${entry.intent.actorId} cannot spawn more than one ship in encounter ${this.id}`,
                };
            }

            const resolution = this.resolvePendingIntent(entry.intent);
            if (resolution.status === PendingIntentStatus.CONSUMED) {
                spawnedActorIds.add(entry.intent.actorId);
            }

            return resolution;
        });
        const nonSpawnResolutions = this.pendingIntents
            .filter((intent) => !orderedSpawnIntentIds.has(intent.intentId))
            .sort(
                (left, right) => left.shipId.localeCompare(right.shipId) || left.intentId.localeCompare(right.intentId),
            )
            .map((intent) => this.resolvePendingIntent(intent));

        this.pendingIntentResolutions = [...spawnResolutions, ...nonSpawnResolutions];
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

    private isDeploymentTurn() {
        return this.turnNumber === 0;
    }

    private assertCanAdvanceTurn() {
        if (!this.isDeploymentTurn()) {
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

    private resolvePendingIntent(intent: EncounterPendingIntent): EncounterPendingIntentResolution {
        if (intent.intentType === PendingShipIntentType.SPAWN) {
            if (!this.isDeploymentTurn()) {
                return {
                    intentId: intent.intentId,
                    status: PendingIntentStatus.REJECTED,
                    resolutionReason: `Ship spawn intent ${intent.intentId} is only valid during deployment turn 0`,
                };
            }

            if (this.ships.some((entry) => entry.shipId === intent.shipId)) {
                return {
                    intentId: intent.intentId,
                    status: PendingIntentStatus.REJECTED,
                    resolutionReason: `Ship ${intent.shipId} is already spawned in encounter ${this.id}`,
                };
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

            return {
                intentId: intent.intentId,
                status: PendingIntentStatus.CONSUMED,
            };
        }

        const ship = this.ships.find((entry) => entry.shipId === intent.shipId);
        if (!ship) {
            return {
                intentId: intent.intentId,
                status: PendingIntentStatus.REJECTED,
                resolutionReason: `Ship ${intent.shipId} is not available in encounter ${this.id}`,
            };
        }

        switch (intent.intentType) {
            case PendingShipIntentType.ACCELERATE: {
                const seamanshipRoll = this.resolvePendingIntentRoll(
                    intent,
                    'accelerate-seamanship',
                    0,
                    ship.ship.skills.seamanship + ship.modifierBucket.total('seamanship'),
                );
                ship.accelerate(seamanshipRoll);
                break;
            }
            case PendingShipIntentType.DECELERATE:
                ship.decelerate();
                break;
            case PendingShipIntentType.TURN_LEFT:
                ship.turnLeft();
                break;
            case PendingShipIntentType.TURN_RIGHT:
                ship.turnRight();
                break;
            default:
                const unsupportedIntent = intent as { intentId: string; intentType: string };
                return {
                    intentId: unsupportedIntent.intentId,
                    status: PendingIntentStatus.REJECTED,
                    resolutionReason: `Unsupported intent type ${unsupportedIntent.intentType}`,
                };
        }

        return {
            intentId: intent.intentId,
            status: PendingIntentStatus.CONSUMED,
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
        if (this.ships.length === 0) {
            return;
        }

        const paths = this.ships.map((ship) => this.buildShipTurnPath(ship));
        this.applyCollisionStops(paths);

        paths.forEach((path) => {
            const finalPosition = path.path[path.currentStep] ?? path.path[path.path.length - 1];
            path.ship.moveTo(finalPosition);
        });
    }

    private buildShipTurnPath(ship: ShipToEncounterEntity): ShipTurnPath {
        const path: AxialPoint[] = [{ ...ship.position }];
        let currentPosition = { ...ship.position };
        const speed = Math.max(0, ship.actualSpeed ?? 0);

        for (let i = 0; i < speed; i += 1) {
            const nextPosition = stepAxialPosition(currentPosition, ship.actualDirection);
            if (distanceBetweenAxialPoints(nextPosition, this.center) > this.radius) {
                break;
            }
            path.push(nextPosition);
            currentPosition = nextPosition;
        }

        return {
            ship,
            path,
            currentStep: 0,
            hasCollided: false,
        };
    }

    private applyCollisionStops(paths: ShipTurnPath[]) {
        if (paths.length === 0) {
            return;
        }

        const longestPath = Math.max(...paths.map((path) => path.path.length));
        let elapsedTime = 0;

        for (let i = 0; i < longestPath; i += 1) {
            elapsedTime += 1 / longestPath;
            const currentPositions = new Map<string, { shipIds: string[]; position: AxialPoint }>();

            paths.forEach((path) => {
                if (path.hasCollided) {
                    return;
                }

                const shipStepTime = 1 / path.path.length;
                const currentStep = Math.min(path.path.length - 1, Math.floor(elapsedTime / shipStepTime));
                const position = path.path[currentStep];
                const hash = `${position.q},${position.r}`;
                const entry = currentPositions.get(hash);
                path.currentStep = currentStep;

                if (entry) {
                    entry.shipIds.push(path.ship.shipId);
                    return;
                }

                currentPositions.set(hash, {
                    shipIds: [path.ship.shipId],
                    position,
                });
            });

            currentPositions.forEach(({ shipIds }) => {
                if (shipIds.length < 2) {
                    return;
                }

                paths.forEach((path) => {
                    if (shipIds.includes(path.ship.shipId)) {
                        path.hasCollided = true;
                    }
                });
            });
        }
    }
}
