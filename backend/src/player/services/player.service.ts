import { Injectable } from '@nestjs/common';

import { PlayerDocument } from '../schemas/player.schema';
import { PlayerRepository } from '../repositories/player.repository';
import { Ship } from '../../sea-combat/schemas/ship.schema';

@Injectable()
export class PlayerService {
    constructor(private readonly playerRepository: PlayerRepository) {}

    ownAShip(player: PlayerDocument, ship: Ship) {
        const ownedShip = player.ownedShips.find(
            (owned) => owned._id === ship._id,
        );

        if (ownedShip) {
            throw new Error(
                `Player ${player._id} already owns ship with id ${ship._id}`,
            );
        }

        player.ownedShips.push({ _id: ship._id });

        return player.save();
    }
}
