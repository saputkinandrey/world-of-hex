import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ProjectionType, QueryOptions } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { Ship, ShipDocument } from '../schemas/ship.schema';

@Injectable()
export class ShipRepository {
    constructor(
        @InjectModel(Ship.name)
        private readonly shipModel: Model<Ship>,
    ) {}

    findOneById(id: string) {
        return this.shipModel.findById(id) as Promise<ShipDocument>;
    }
    create(ship: Partial<Ship>) {
        return this.shipModel.create(ship);
    }

    find(
        filter: FilterQuery<Ship>,
        projection?: ProjectionType<Ship>,
        options?: QueryOptions<Ship>,
    ) {
        return this.shipModel.find(filter, projection, options) as Promise<
            ShipDocument[]
        >;
    }
}
