import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { Direction } from '../types/direction.type';
import Vector from 'vector2js';

export type EncounterDocument = HydratedDocument<Encounter>;

export class ShipToEncounter {
  @Prop({ type: Vector })
  position: Vector;

  @Prop({ type: Direction })
  direction: Direction;

  @Prop({ type: Number })
  speed: number;
}

export class CharacterToEncounter extends EntityDocumentHelper {
  // @Prop({
  //   type: Ship,
  //   default: null,
  // })
  // selectedShip: Ship;

  @Prop({ type: String })
  name: string;
}

@Schema({
  id: false,
  collection: 'rps-encounters',
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: false,
  },
})
export class Encounter extends EntityDocumentHelper {
  @Prop({
    type: [CharacterToEncounter],
    default: [],
  })
  characters: CharacterToEncounter[];

  @Prop({})
  radius: number;

  @Prop({
    type: String,
  })
  name: string | null;
}

export const EncounterSchema = SchemaFactory.createForClass(Encounter);
