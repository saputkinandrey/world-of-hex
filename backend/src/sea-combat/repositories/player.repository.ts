import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ProjectionType, QueryOptions } from 'mongoose';
import { Injectable } from '@nestjs/common';
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

  create(player: Player) {
    return this.playerModel.create(player);
  }
}
