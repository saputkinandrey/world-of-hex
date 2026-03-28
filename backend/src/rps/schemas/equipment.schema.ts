import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { Direction } from '../types/direction.type';
import Vector from 'vector2js';
import { VectorSchema } from '../../utils/vector.schema';

export type EncounterDocument = HydratedDocument<Equipment>;

export class ShipToEncounter {
    @Prop({ type: VectorSchema })
    position: Vector;

    @Prop({ type: String, enum: Object.values(Direction) })
    direction: Direction;

    @Prop({ type: Number })
    speed: number;
}

@Schema({
    id: false,
    collection: 'rps-equipment',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class Equipment extends EntityDocumentHelper {
    @Prop({})
    radius: number;

    @Prop({
        type: String,
    })
    name: string | null;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);
