import { AggregateRoot, AggregateRootName } from '@event-nest/core';

@AggregateRootName(EncounterRoot.name)
export class EncounterRoot extends AggregateRoot {
  characters: object[] = [];

  createdAt: Date = new Date();

  updatedAt: Date;

  deletedAt: Date;
}
