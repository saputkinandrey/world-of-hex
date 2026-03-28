import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { Direction } from '../types/direction.type';
import { Ship } from './ship.schema';
import Vector from 'vector2js';
import { withAggregateRoot } from '../../utils/with-aggregate-root.mixin';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { VectorSchema } from '../../utils/vector.schema';

export type EncounterDocument = HydratedDocument<Encounter>;

export class ShipToEncounter {
    @Prop({ type: VectorSchema })
    position: Vector;

    @Prop({ type: String, enum: Object.values(Direction) })
    direction: Direction;

    @Prop({ type: Number })
    speed: number;

    @Prop({ type: Ship })
    ship: Ship;

    @Prop({
        type: String,
        enum: Object.values(ShipEncounterIntent),
        default: null,
    })
    intent?: ShipEncounterIntent | null;
}

export class PlayerToEncounter extends EntityDocumentHelper {
    @Prop({
        type: Ship,
        default: null,
    })
    selectedShip: Ship;

    @Prop({ type: String })
    name: string;
}

@Schema({
    id: false,
    collection: 'encounters',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class Encounter extends EntityDocumentHelper {
    @Prop({
        type: [PlayerToEncounter],
        default: [],
    })
    players: PlayerToEncounter[];

    @Prop({
        type: [ShipToEncounter],
        default: [],
    })
    ships: ShipToEncounter[];

    @Prop({ type: VectorSchema, default: () => ({ x: 0, y: 0 }) })
    center: Vector;

    @Prop({ type: String, enum: Object.values(Direction) })
    windDirection: Direction;

    @Prop({})
    radius: number;

    @Prop({
        type: String,
    })
    name: string | null;
}

const EncounterAR = withAggregateRoot(Encounter);

export const EncounterSchema = SchemaFactory.createForClass(Encounter);
