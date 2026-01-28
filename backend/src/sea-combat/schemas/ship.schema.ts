import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { ShipType } from '../types/ship-type.type';

export type ShipDocument = HydratedDocument<Ship>;

@Schema({
    id: false,
    collection: 'ships',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: true,
    },
})
export class Ship extends EntityDocumentHelper {
    @Prop({
        type: String,
        unique: true,
    })
    name: string | null;

    @Prop({
        type: String, // Тип — строка
        enum: Object.values(ShipType), // Перечисляем допустимые значения из enum
        required: true,
    })
    type: ShipType;

    @Prop()
    speed: number;
}

export const ShipSchema = SchemaFactory.createForClass(Ship);
