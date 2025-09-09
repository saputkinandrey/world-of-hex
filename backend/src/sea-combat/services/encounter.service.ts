import { Injectable, NotFoundException } from '@nestjs/common';

import { EncounterRepository } from '../repositories/encounter.repository';

import {
  Encounter,
  EncounterDocument,
  PlayerToEncounter,
  ShipToEncounter,
} from '../schemas/encounter.schema';
import { Player } from '../schemas/player.schema';
import { Ship, ShipDocument } from '../schemas/ship.schema';
import {
  DirectionToVectorEven,
  DirectionToVectorOdd,
  VectorEvenToDirection,
  VectorOddToDirection,
} from '../types/direction.type';
import { spawnShipAtEncounter } from '../utils/spawn-ship-at-encounter.util';
import Vector from 'vector2js';
import { ShipPathDto } from '../dto/encounters/ship-path.dto';
import { ShipsCollisionDto } from '../dto/encounters/ships-collision.dto';

@Injectable()
export class EncounterService {
  encounters: Encounter[] = [];

  constructor(
    private readonly encounterRepository: EncounterRepository,
    // private readonly eventStore: EventStore,
    // private readonly eventBus: StoreEventBus,
  ) {}

  async findOneById(encounterId: string) {
    return this.encounterRepository.findOneById(encounterId);
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
      const result: Record<string, { shipIds: string[]; position: Vector }> =
        {};
      for (const [hash, keys] of Object.entries(map)) {
        if (keys.length > 1) {
          result[hash] = { shipIds: keys, position: Vector.fromString(hash) };
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
        const currentStep = Math.min(
          path.path.length - 1,
          Math.floor(elapsedTime / shipStepTime),
        );
        currentPositions[path.ship.ship._id] = path.path[currentStep];
        path.currentStep = currentStep;
      });
      // here to stop movement for colliding ships and save these collisions to result
      // check for collisions. If any two or more positions are equal collision occurred
      const rawCollisions = findEqualVectors(currentPositions);

      for (const { shipIds, position } of Object.values(rawCollisions)) {
        // если нашли совпадение
        const collidedShips = paths.filter((p) =>
          shipIds.includes(p.ship.ship._id),
        );

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
          nextStepPosition = ship.position.add(
            DirectionToVectorEven[ship.direction],
          );
        } else {
          nextStepPosition = ship.position.add(
            DirectionToVectorOdd[ship.direction],
          );
        }
        path.push(nextStepPosition);
      }
      return { path, ship } as ShipPathDto;
    });

    const collisions = this.checkForCollisions(paths);

    // check all ships for collisions
  }

  async shipJoinsEncounter(ship: ShipDocument, encounter: EncounterDocument) {
    let joinedShip = encounter.ships.find((shp) => shp.ship._id === ship._id);
    if (!joinedShip) {
      const spawnPoint = spawnShipAtEncounter(encounter.radius);
      const reversePoint = spawnPoint
        .mulScalar(-1)
        .divScalar(encounter.radius)
        .apply((dim) => Math.round(dim));

      const reverseDirection =
        spawnPoint.x % 2 === 0
          ? VectorEvenToDirection[reversePoint.toString()]
          : VectorOddToDirection[reversePoint.toString()];

      joinedShip = {
        ship: ship,
        speed: ship.speed,
        direction: reverseDirection,
        position: spawnPoint.add(reversePoint.mulScalar(ship.speed)),
      } as ShipToEncounter;
      encounter.ships.push(joinedShip);
    }
    return encounter.save();
  }

  async shipLeavesEncounter(ship: ShipDocument, encounter: EncounterDocument) {
    const joinedShip = encounter.ships.find((shp) => shp.ship._id === ship._id);
    if (!joinedShip) {
      throw new Error(
        `Ship with id ${ship._id} not joined encounter ${encounter._id}`,
      );
    }
    encounter.ships = encounter.ships.filter((shp) => {
      return shp.ship._id !== ship._id;
    });
    return encounter.save();
  }

  async playerJoinsEncounter(player: Player, encounterId: string) {
    const foundEncounter =
      await this.encounterRepository.findOneById(encounterId);
    if (!foundEncounter) {
      throw new Error(`Encounter with id ${encounterId} not found`);
    }

    let joinedPlayer = foundEncounter.players.find(
      (plr) => plr._id === player._id,
    );
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
    const foundEncounter =
      await this.encounterRepository.findOneById(encounterId);
    if (!foundEncounter) {
      throw new Error(`Encounter with id ${encounterId} not found`);
    }

    const joinedPlayer = foundEncounter.players.find(
      (plr) => plr._id === player._id,
    );
    if (!joinedPlayer) {
      throw new Error(
        `Player with id ${player._id} not joined encounter ${encounterId}`,
      );
    }
    foundEncounter.players = foundEncounter.players.filter((pl) => {
      return pl._id !== player._id;
    });
    return foundEncounter.save();
  }
}
