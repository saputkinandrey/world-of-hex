import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_STORE, EventStore } from '@event-nest/core';

import { EncounterRepository } from '../repositories/encounter.repository';

import { Encounter, EncounterDocument, PlayerToEncounter, ShipToEncounter } from '../schemas/encounter.schema';
import { Player } from '../../player/schemas/player.schema';
import { ShipDocument } from '../schemas/ship.schema';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { EncounterAggregate } from '../domain/encounter/encounter.root';
import { ShipEntity } from '../__entities/ship.entity';
import { ShipSkillsEntity } from '../__entities/ship-skills.entity';
import Vector from 'vector2js';
import { ShipPathDto } from '../dto/encounters/ship-path.dto';
import { ShipsCollisionDto } from '../dto/encounters/ships-collision.dto';
import { Types } from 'mongoose';
import { toVector } from '../../utils/vector.schema';
import { bindChildActions } from '../../utils/child-action.decorator';
import { ShipToEncounterEntity } from '../domain/encounter/entities/ship-to-encounter.entity';
import {
    axialToOffsetPoint,
    distanceBetweenOffsetPoints,
    moveOffsetPosition,
    offsetToAxialPoint,
} from '../utils/hex-coordinate.util';
import { PlayerRepository } from '../../player/repositories/player.repository';

@Injectable()
export class EncounterService {
    encounters: Encounter[] = [];

    constructor(
        private readonly encounterRepository: EncounterRepository,
        private readonly playerRepository: PlayerRepository,
        @Inject(EVENT_STORE)
        private readonly eventStore: EventStore,
    ) {}

    private async loadEncounterAggregate(encounterId: string) {
        const aggregate = this.eventStore.addPublisher(new EncounterAggregate(encounterId));
        const encounter = await this.encounterRepository.findOneById(encounterId);

        if (!encounter) {
            throw new NotFoundException(`Encounter with id ${encounterId} not found`);
        }

        return this.rebuildAggregateFromProjection(aggregate, encounter);
    }

    private async rebuildAggregateFromProjection(aggregate: EncounterAggregate, encounter: EncounterDocument) {
        (aggregate as any)._version = await this.eventStore.findAggregateRootVersion(encounter._id.toString());
        aggregate.setName(encounter.name ?? null);
        aggregate.setRadius(encounter.radius);
        aggregate.setCenter(offsetToAxialPoint(toVector(encounter.center)));

        if (encounter.windDirection) {
            aggregate.windrose.setDirection(encounter.windDirection);
        }

        aggregate.ships.length = 0;

        encounter.ships.forEach((storedShip) => {
            const shipId = storedShip.ship?._id?.toString();
            if (!shipId) {
                return;
            }

            const shipEntity = Object.assign(new ShipEntity(), {
                id: shipId,
                name: storedShip.ship.name,
                speed: storedShip.ship.speed,
                type: storedShip.ship.type,
                skills: new ShipSkillsEntity().setSeamanship(12).setTactics(storedShip.ship.tactics ?? 10),
            });

            const shipToEncounter = Object.assign(new ShipToEncounterEntity(), {
                ship: shipEntity,
                shipId,
                position: offsetToAxialPoint(toVector(storedShip.position)),
                intent: storedShip.intent ?? null,
            });

            shipToEncounter.setActualSpeed(storedShip.speed ?? 0);
            if (storedShip.direction) {
                shipToEncounter.setActualDirection(storedShip.direction);
            }

            bindChildActions(aggregate, shipToEncounter, `ship_${shipId}`);
            aggregate.ships.push(shipToEncounter);
        });

        return aggregate;
    }

    async createEncounter(name: string | null, radius: number) {
        const id = new Types.ObjectId().toHexString();
        const encounterAggregate = this.eventStore.addPublisher(new EncounterAggregate(id));
        encounterAggregate.setName(name).moveCenter({ q: 0, r: 0 }).adjustRadius(radius).reRollWindDirection();
        await encounterAggregate.commit();

        return this.encounterRepository.create({
            _id: encounterAggregate.id,
            name: encounterAggregate.name,
            radius: encounterAggregate.radius,
            center: axialToOffsetPoint(encounterAggregate.center),
            windDirection: encounterAggregate.windrose.direction,
            players: [],
            ships: [],
        });
    }

    async findOneById(encounterId: string) {
        return this.encounterRepository.findOneById(encounterId);
    }

    async findAllEncounters() {
        return this.encounterRepository.find({}, {}, { sort: { createdAt: -1 } });
    }

    checkForCollisions(paths: ShipPathDto[]): ShipsCollisionDto[] {
        const findEqualVectors = (
            vectors: Record<string, Vector>,
        ): Record<string, { shipIds: string[]; position: Vector }> => {
            // создаём карту: "x,y" → массив ключей
            const map: Record<string, string[]> = {};

            for (const [key, vec] of Object.entries(vectors)) {
                const hash = vec.toString(); // например "2,3"
                if (!map[hash]) {
                    map[hash] = [];
                }
                map[hash].push(key);
            }

            // фильтруем только те, где больше одного ключа
            const result: Record<string, { shipIds: string[]; position: Vector }> = {};
            for (const [hash, keys] of Object.entries(map)) {
                if (keys.length > 1) {
                    result[hash] = {
                        shipIds: keys,
                        position: Vector.fromString(hash),
                    };
                }
            }

            return result;
        };

        const longestPath = Math.max(...paths.map((p) => p.path.length));
        const collisions: ShipsCollisionDto[] = [];

        let elapsedTime = 0;

        for (let i = 0; i < longestPath; i++) {
            elapsedTime += 1 / longestPath;
            const currentPositions: Record<string, Vector> = {};

            paths.forEach((path) => {
                if (path.hasCollided) {
                    return; // этот корабль уже "заморожен"
                }
                const shipStepTime = 1 / path.path.length;
                const currentStep = Math.min(path.path.length - 1, Math.floor(elapsedTime / shipStepTime));
                currentPositions[path.ship.ship._id] = path.path[currentStep];
                path.currentStep = currentStep;
            });
            // here to stop movement for colliding ships and save these collisions to result
            // check for collisions. If any two or more positions are equal collision occurred
            const rawCollisions = findEqualVectors(currentPositions);

            for (const { shipIds, position } of Object.values(rawCollisions)) {
                // если нашли совпадение
                const collidedShips = paths.filter((p) => shipIds.includes(p.ship.ship._id));

                // помечаем — теперь они больше не двигаются
                collidedShips.forEach((p) => {
                    if (!p.hasCollided) {
                        p.hasCollided = true;
                    }
                });

                // фиксируем коллизию
                collisions.push({
                    ships: collidedShips.map((p) => p.ship),
                    position,
                });
            }
        }

        return collisions;
    }

    async processEncounterTurn(encounterId: string) {
        const encounter = await this.encounterRepository.findOneById(encounterId);
        if (!encounter) {
            throw new NotFoundException();
        }

        const paths = encounter.ships.map((ship: ShipToEncounter) => {
            const startPosition = toVector(ship.position);
            const path: Vector[] = [startPosition];
            let currentPosition = startPosition;

            for (let i = 0; i < ship.speed; i++) {
                const nextStep = moveOffsetPosition(currentPosition, ship.direction, 1);
                const nextStepPosition = new Vector(nextStep.x, nextStep.y);
                path.push(nextStepPosition);
                currentPosition = nextStepPosition;
            }
            return { path, ship } as ShipPathDto;
        });

        const collisions = this.checkForCollisions(paths);

        // check all ships for collisions
    }

    async advanceTurn(encounterId: string) {
        const aggregate = await this.loadEncounterAggregate(encounterId);
        aggregate.advanceTurn();
        await aggregate.commit();
    }

    async shipJoinsEncounter(ship: ShipDocument, encounter: EncounterDocument, intent?: ShipEncounterIntent) {
        const shipId = ship._id?.toString();
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

        const joinedShip = encounter.ships.find((shp) => shp.ship?._id?.toString() === shipId);
        if (joinedShip) {
            throw new Error(`Ship with id ${ship._id} already joined encounter ${encounter._id}`);
        } else {
            const encounterId = encounter._id?.toString();
            if (!encounterId) {
                throw new Error('Encounter id is missing');
            }
            const aggregate = await this.loadEncounterAggregate(encounterId);

            const shipEntity = Object.assign(new ShipEntity(), {
                id: ship._id?.toString(),
                name: ship.name,
                speed: ship.speed,
                type: ship.type,
                skills: new ShipSkillsEntity().setSeamanship(12).setTactics(ship.tactics ?? 10),
            });

            aggregate.spawnShip(shipEntity, intent ?? null);
            const spawned = aggregate.ships.find((item) => item.shipId === shipEntity.id);
            if (!spawned) {
                throw new Error(`Failed to spawn ship ${ship._id} in encounter ${encounter._id}`);
            }

            encounter.ships.push({
                ship: ship,
                speed: spawned.actualSpeed,
                direction: spawned.actualDirection,
                position: axialToOffsetPoint(spawned.position),
                intent: spawned.intent ?? null,
            } as ShipToEncounter);
            await aggregate.commit();
        }
        return encounter.save();
    }

    async shipLeavesEncounter(ship: ShipDocument, encounter: EncounterDocument) {
        const shipId = ship._id?.toString();
        const joinedShip = encounter.ships.find((shp) => shp.ship?._id?.toString() === shipId);
        if (!joinedShip) {
            throw new Error(`Ship with id ${ship._id} not joined encounter ${encounter._id}`);
        }

        encounter.ships = encounter.ships.filter((shp) => {
            return shp.ship?._id?.toString() !== shipId;
        });
        encounter.markModified('ships');

        const savedEncounter = await encounter.save();
        if (!shipId) {
            return savedEncounter;
        }

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

    async updateShipPlacement(
        ship: ShipDocument,
        encounter: EncounterDocument,
        update: {
            position: { x: number; y: number };
            direction?: string;
            speed?: number;
        },
    ) {
        const joinedShip = encounter.ships.find((entry) => entry.ship?._id?.toString() === ship._id?.toString());
        if (!joinedShip) {
            throw new NotFoundException(`Ship with id ${ship._id} not joined encounter ${encounter._id}`);
        }

        const nextPosition = toVector(update.position);
        const distanceFromCenter = distanceBetweenOffsetPoints(nextPosition, toVector(encounter.center));
        if (distanceFromCenter > encounter.radius) {
            throw new BadRequestException(
                `Position ${nextPosition.toString()} is outside encounter radius ${encounter.radius}`,
            );
        }

        const hasCollision = encounter.ships.some((entry) => {
            if (entry.ship?._id?.toString() === ship._id?.toString()) {
                return false;
            }

            return toVector(entry.position).equals(nextPosition);
        });
        if (hasCollision) {
            throw new ConflictException(`Position ${nextPosition.toString()} is already occupied`);
        }

        if (typeof update.speed === 'number') {
            const maxSpeed = joinedShip.ship?.speed ?? ship.speed ?? 0;
            if (update.speed < 0 || update.speed > maxSpeed) {
                throw new BadRequestException(`Speed ${update.speed} is outside allowed range 0..${maxSpeed}`);
            }
            joinedShip.speed = update.speed;
        }

        if (update.direction) {
            joinedShip.direction = update.direction as any;
        }

        joinedShip.position = nextPosition as any;
        encounter.markModified('ships');
        return encounter.save();
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
