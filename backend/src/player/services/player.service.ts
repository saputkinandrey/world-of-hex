import { Injectable } from '@nestjs/common';

import { PlayerDocument } from '../schemas/player.schema';
import { PlayerRepository } from '../repositories/player.repository';
import { Ship } from '../../sea-combat/schemas/ship.schema';

@Injectable()
export class PlayerService {
    constructor(private readonly playerRepository: PlayerRepository) {}

    ownAShip(player: PlayerDocument, ship: Ship) {
        const ownedShip = player.ownedShips.find((owned) => owned._id === ship._id);

        if (ownedShip) {
            throw new Error(`Player ${player._id} already owns ship with id ${ship._id}`);
        }

        return this.playerRepository.findOwnerByShipId(ship._id).then((owner) => {
            if (owner && owner._id.toString() !== player._id.toString()) {
                throw new Error(`Ship ${ship._id} already owned by player ${owner._id}`);
            }

            player.ownedShips.push({ _id: ship._id });
            return player.save();
        });
    }

    async unownShip(player: PlayerDocument, shipId: string) {
        const beforeCount = player.ownedShips.length;
        player.ownedShips = player.ownedShips.filter((owned) => owned._id !== shipId);
        if (player.ownedShips.length === beforeCount) {
            throw new Error(`Player ${player._id} does not own ship with id ${shipId}`);
        }
        return player.save();
    }
}
