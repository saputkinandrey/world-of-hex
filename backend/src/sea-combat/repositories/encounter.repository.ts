import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ProjectionType, QueryOptions } from 'mongoose';
import { Encounter, EncounterDocument } from '../schemas/encounter.schema';

@Injectable()
export class EncounterRepository {
  // private readonly aggregate: 'encounters';
  constructor(
    @InjectModel(Encounter.name)
    private readonly encounterModel: Model<Encounter>,
  ) {}

  async findOneById(encounterId: string) {
    return this.encounterModel.findById(
      encounterId,
    ) as Promise<EncounterDocument>;
  }

  create(ship: Encounter) {
    return this.encounterModel.create(ship);
  }

  find(
    filter: FilterQuery<Encounter>,
    projection?: ProjectionType<Encounter>,
    options?: QueryOptions<Encounter>,
  ) {
    return this.encounterModel.find(filter, projection, options) as Promise<
      EncounterDocument[]
    >;
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
