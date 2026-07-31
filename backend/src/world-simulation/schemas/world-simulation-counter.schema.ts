import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WorldSimulationCounterDocument = HydratedDocument<WorldSimulationCounter>;

@Schema({
    id: false,
    collection: 'world-simulation-counters',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class WorldSimulationCounter {
    @Prop({ type: String, required: true })
    _id: string;

    @Prop({ type: Number, required: true, default: 0, min: 0 })
    value: number;
}

export const WorldSimulationCounterSchema = SchemaFactory.createForClass(WorldSimulationCounter);
