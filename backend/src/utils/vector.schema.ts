import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import Vector from 'vector2js';

@Schema({
    _id: false,
    id: false,
})
export class VectorDocument {
    @Prop({ type: Number, default: 0, required: true })
    x: number;

    @Prop({ type: Number, default: 0, required: true })
    y: number;
}

export const VectorSchema = SchemaFactory.createForClass(VectorDocument);

export const toVector = (value: Pick<Vector, 'x' | 'y'> | null | undefined) => {
    if (value instanceof Vector) {
        return value;
    }
    return new Vector(value?.x ?? 0, value?.y ?? 0);
};
