import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { Direction } from '../types/direction.type';
import { EncounterLastTurnRollResult } from '../types/encounter-workspace-view.type';
import { Ship } from './ship.schema';
import { ShipCaptainTargetType } from '../types/ship-captain-target.type';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { VectorPoint, VectorSchema } from '../../utils/vector.schema';

export type EncounterDocument = HydratedDocument<Encounter>;

export class ShipCaptainTargetView {
    @Prop({ type: String, enum: Object.values(ShipCaptainTargetType) })
    type: ShipCaptainTargetType;

    @Prop({ type: String, default: null })
    shipId: string | null;
}

export class ShipToEncounter {
    @Prop({ type: VectorSchema })
    position: VectorPoint;

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

    @Prop({
        type: ShipCaptainTargetView,
        default: () => ({
            type: ShipCaptainTargetType.NEAREST_ENEMY,
            shipId: null,
        }),
    })
    target: ShipCaptainTargetView;
}

export class PlayerToEncounter extends EntityDocumentHelper {
    @Prop({ type: String })
    name: string;
}

export class EncounterLastTurnRollResultView {
    @Prop({ type: String })
    shipId: string;

    @Prop({ type: String })
    shipName: string;

    @Prop({ type: Number, min: 0 })
    turnNumber: number;

    @Prop({ type: String })
    actionKey: string;

    @Prop({ type: String })
    label: string;

    @Prop({ type: String, enum: Object.values(Direction) })
    direction: Direction;

    @Prop({ type: Number })
    roll: number;

    @Prop({ type: Number })
    target: number;

    @Prop({ type: Number })
    mos: number;

    @Prop({ type: Boolean })
    success: boolean;

    @Prop({ type: Boolean })
    isCritSuccess: boolean;

    @Prop({ type: Boolean })
    isCritFailure: boolean;

    @Prop({ type: Number })
    windModifier: number;

    @Prop({ type: String, default: null })
    note?: string | null;
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

    @Prop({
        type: [EncounterLastTurnRollResultView],
        default: [],
    })
    lastTurnRollResults: EncounterLastTurnRollResult[];

    @Prop({ type: VectorSchema, default: () => ({ x: 0, y: 0 }) })
    center: VectorPoint;

    @Prop({ type: String, enum: Object.values(Direction) })
    windDirection: Direction;

    @Prop({ type: Number, default: 0, min: 0 })
    currentTurn: number;

    @Prop({})
    radius: number;

    @Prop({
        type: String,
    })
    name: string | null;
}

export const EncounterSchema = SchemaFactory.createForClass(Encounter);
