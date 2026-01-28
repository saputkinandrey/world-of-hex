import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';

export type PlayerDocument = HydratedDocument<Player>;

export class ShipToPlayer extends EntityDocumentHelper {}

@Schema({
    id: false,
    collection: 'players',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: true,
    },
})
export class Player extends EntityDocumentHelper {
    @Prop({
        type: String,
        unique: true,
    })
    name: string | null;

    @Prop({
        type: [ShipToPlayer],
        default: [],
    })
    ownedShips: ShipToPlayer[];
}

export const PlayerSchema = SchemaFactory.createForClass(Player);
