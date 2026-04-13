import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ProjectionType, QueryOptions } from 'mongoose';
import { Encounter, EncounterDocument } from '../schemas/encounter.schema';

type RemovePlayerReferencesFromAllResult = {
    removedPlayerEntries: number;
};

@Injectable()
export class EncounterRepository {
    // private readonly aggregate: 'encounters';
    constructor(
        @InjectModel(Encounter.name)
        private readonly encounterModel: Model<Encounter>,
    ) {}

    async findOneById(encounterId: string) {
        return this.encounterModel.findById(encounterId) as Promise<EncounterDocument>;
    }

    create(ship: Partial<Encounter>) {
        return this.encounterModel.create(ship);
    }

    find(filter: FilterQuery<Encounter>, projection?: ProjectionType<Encounter>, options?: QueryOptions<Encounter>) {
        return this.encounterModel.find(filter, projection, options) as Promise<EncounterDocument[]>;
    }

    async removePlayerReferencesFromAll(playerId: string): Promise<RemovePlayerReferencesFromAllResult> {
        const encounters = await this.encounterModel.find({ 'players._id': playerId });
        let removedPlayerEntries = 0;

        for (const encounter of encounters) {
            const originalPlayerCount = encounter.players.length;
            encounter.players = encounter.players.filter((player) => player._id?.toString() !== playerId);

            if (encounter.players.length === originalPlayerCount) {
                continue;
            }

            removedPlayerEntries += originalPlayerCount - encounter.players.length;
            encounter.markModified('players');
            await encounter.save();
        }

        return {
            removedPlayerEntries,
        };
    }

    async removeShipReferencesFromAll(shipId: string) {
        const encounters = await this.encounterModel.find({
            $or: [{ 'ships.ship._id': shipId }, { 'players.selectedShip._id': shipId }],
        });

        let removedShipEntries = 0;
        let clearedSelectedShips = 0;

        for (const encounter of encounters) {
            const originalShipCount = encounter.ships.length;
            encounter.ships = encounter.ships.filter((entry) => entry.ship?._id?.toString() !== shipId);
            removedShipEntries += originalShipCount - encounter.ships.length;
            let clearedSelectedShipsInEncounter = 0;

            encounter.players.forEach((player) => {
                if (player.selectedShip?._id?.toString() !== shipId) {
                    return;
                }

                player.selectedShip = null as any;
                clearedSelectedShips += 1;
                clearedSelectedShipsInEncounter += 1;
            });

            if (originalShipCount !== encounter.ships.length || clearedSelectedShipsInEncounter > 0) {
                if (originalShipCount !== encounter.ships.length) {
                    encounter.markModified('ships');
                }
                if (clearedSelectedShipsInEncounter > 0) {
                    encounter.markModified('players');
                }
                await encounter.save();
            }
        }

        return {
            removedShipEntries,
            clearedSelectedShips,
        };
    }

    async disconnectPlayerWithoutShips(playerId: string, ownedShipIds: string[]) {
        const encounters = await this.encounterModel.find({ 'players._id': playerId });
        const ownedShipIdSet = new Set(ownedShipIds);
        let disconnectedPlayers = 0;

        for (const encounter of encounters) {
            const hasOwnedShipInEncounter = encounter.ships.some((entry) => {
                const shipId = entry.ship?._id?.toString();
                return Boolean(shipId && ownedShipIdSet.has(shipId));
            });

            if (hasOwnedShipInEncounter) {
                continue;
            }

            const originalPlayerCount = encounter.players.length;
            encounter.players = encounter.players.filter((player) => player._id?.toString() !== playerId);

            if (encounter.players.length === originalPlayerCount) {
                continue;
            }

            disconnectedPlayers += originalPlayerCount - encounter.players.length;
            encounter.markModified('players');
            await encounter.save();
        }

        return disconnectedPlayers;
    }

    // async findOneById(id: string): Promise<EncounterModel> {
    //   const encounters = new EncounterModel(id);
    //
    //   encounters.loadFromHistory(
    //     await this.eventStore.getEvents(this.aggregate, id),
    //   );
    //   return encounters;
    // }
}
