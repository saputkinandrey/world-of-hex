import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ProjectionType, QueryOptions } from 'mongoose';
import { Player, PlayerDocument } from '../schemas/player.schema';

@Injectable()
export class PlayerRepository {
    constructor(
        @InjectModel(Player.name)
        private readonly playerModel: Model<Player>,
    ) {}

    findOneById(id: string) {
        return this.playerModel.findById(id).exec() as Promise<PlayerDocument>;
    }

    find(
        filter: FilterQuery<Player>,
        projection?: ProjectionType<Player>,
        options?: QueryOptions<Player>,
    ) {
        return this.playerModel.find(filter, projection, options) as Promise<
            PlayerDocument[]
        >;
    }

    findOwnerByShipId(shipId: string) {
        return this.playerModel
            .findOne({ 'ownedShips._id': shipId })
            .exec() as Promise<PlayerDocument | null>;
    }

    deleteById(id: string) {
        return this.playerModel.findByIdAndDelete(id).exec();
    }

    removeShipFromAll(shipId: string) {
        return this.playerModel.updateMany(
            {},
            { $pull: { ownedShips: { _id: shipId } } },
        );
    }

    create(player: Partial<Player>) {
        return this.playerModel.create(player);
    }
}
