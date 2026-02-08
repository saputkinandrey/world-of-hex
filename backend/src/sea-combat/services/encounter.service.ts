import { Injectable, NotFoundException } from '@nestjs/common';

import { EncounterRepository } from '../repositories/encounter.repository';

import { Encounter, EncounterDocument, PlayerToEncounter, ShipToEncounter } from '../schemas/encounter.schema';
import { Player } from '../../player/schemas/player.schema';
import { ShipDocument } from '../schemas/ship.schema';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { DirectionToVectorEven, DirectionToVectorOdd } from '../types/direction.type';
import { EncounterAggregate } from '../domain/encounter/encounter.root';
import { ShipEntity } from '../__entities/ship.entity';
import { ShipSkillsEntity } from '../__entities/ship-skills.entity';
import Vector from 'vector2js';
import { ShipPathDto } from '../dto/encounters/ship-path.dto';
import { ShipsCollisionDto } from '../dto/encounters/ships-collision.dto';
import { Types } from 'mongoose';

@Injectable()
export class EncounterService {
    encounters: Encounter[] = [];

    constructor(
        private readonly encounterRepository: EncounterRepository,
        // private readonly eventStore: EventStore,
        // private readonly eventBus: StoreEventBus,
    ) {}

    async createEncounter(name: string | null, radius: number) {
        const id = new Types.ObjectId().toHexString();
        const encounterAggregate = new EncounterAggregate(id)
            .setName(name)
            .setRadius(radius)
            .setCenter(new Vector(0, 0))
            .reRollWindDirection();

        return this.encounterRepository.create({
            _id: encounterAggregate.id,
            name: encounterAggregate.name,
            radius: encounterAggregate.radius,
            center: encounterAggregate.center,
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
            const path: Vector[] = [ship.position];

            for (let i = 0; i < ship.speed; i++) {
                let nextStepPosition: Vector;
                if (ship.position.x % 2 === 1) {
                    nextStepPosition = ship.position.add(DirectionToVectorEven[ship.direction]);
                } else {
                    nextStepPosition = ship.position.add(DirectionToVectorOdd[ship.direction]);
                }
                path.push(nextStepPosition);
            }
            return { path, ship } as ShipPathDto;
        });

        const collisions = this.checkForCollisions(paths);

        // check all ships for collisions
    }

    async shipJoinsEncounter(ship: ShipDocument, encounter: EncounterDocument, intent?: ShipEncounterIntent) {
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

        const joinedShip = encounter.ships.find((shp) => shp.ship._id === ship._id);
        if (joinedShip) {
            throw new Error(`Ship with id ${ship._id} already joined encounter ${encounter._id}`);
        } else {
            const center = encounter.center ? new Vector(encounter.center.x, encounter.center.y) : new Vector(0, 0);
            const aggregate = new EncounterAggregate(encounter._id?.toString() ?? new Types.ObjectId().toHexString())
                .setName(encounter.name ?? null)
                .setRadius(encounter.radius ?? 0)
                .setCenter(center);

            if (!encounter.windDirection) {
                throw new Error(`Encounter ${encounter._id} has no windDirection set`);
            }
            aggregate.windrose.setDirection(encounter.windDirection);

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
                position: spawned.position,
                intent: spawned.intent ?? null,
            } as ShipToEncounter);
        }
        return encounter.save();
    }

    async shipLeavesEncounter(ship: ShipDocument, encounter: EncounterDocument) {
        const joinedShip = encounter.ships.find((shp) => shp.ship._id === ship._id);
        if (!joinedShip) {
            throw new Error(`Ship with id ${ship._id} not joined encounter ${encounter._id}`);
        }
        encounter.ships = encounter.ships.filter((shp) => {
            return shp.ship._id !== ship._id;
        });
        return encounter.save();
    }

    isPlayerJoinedToEncounter(player: Player, encounter: EncounterDocument) {
        const joinedPlayer = encounter.players.find((plr) => plr._id === player._id);
        return !!joinedPlayer;
    }

    async playerJoinsEncounter(player: Player, encounterId: string) {
        const foundEncounter = await this.encounterRepository.findOneById(encounterId);
        if (!foundEncounter) {
            throw new Error(`Encounter with id ${encounterId} not found`);
        }

        let joinedPlayer = foundEncounter.players.find((plr) => plr._id === player._id);
        if (!joinedPlayer) {
            joinedPlayer = {
                _id: player._id,
                name: player.name,
            } as PlayerToEncounter;
            foundEncounter.players.push(joinedPlayer);
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

        const joinedPlayer = foundEncounter.players.find((plr) => plr._id === player._id);
        if (!joinedPlayer) {
            throw new Error(`Player with id ${player._id} not joined encounter ${encounterId}`);
        }
        foundEncounter.players = foundEncounter.players.filter((pl) => {
            return pl._id !== player._id;
        });
        return foundEncounter.save();
    }
}
