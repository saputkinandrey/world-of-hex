import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

const ENCOUNTER_PROJECTION_COLLECTION = 'encounters';
const PENDING_INTENT_COLLECTION = 'sea-combat-pending-intents';
const TURN_ADVANCE_REQUEST_COLLECTION = 'sea-combat-turn-advance-requests';
const TURN_ENTROPY_COLLECTION = 'sea-combat-turn-entropy';
const TURN_INPUT_FROZEN_COLLECTION = 'sea-combat-turn-input-frozen';
const EVENT_STORE_AGGREGATES_COLLECTION = 'aggregates-collection';
const EVENT_STORE_EVENTS_COLLECTION = 'events-collection';

type DeleteEncounterResult = {
    encounterId: string;
    deletedProjectionCount: number;
    deletedPendingIntentCount: number;
    deletedTurnAdvanceRequestCount: number;
    deletedTurnEntropyCount: number;
    deletedTurnInputFrozenCount: number;
    deletedEventCount: number;
    deletedAggregateCount: number;
};

type DeleteByIdResult = {
    deletedCount?: number;
};

type MongoDbHandle = NonNullable<Connection['db']>;
type CleanupCollectionDocument = {
    _id?: unknown;
    [key: string]: unknown;
};

@Injectable()
export class EncounterCleanupRepository {
    constructor(
        @InjectConnection()
        private readonly connection: Connection,
    ) {}

    async deleteEncounter(encounterId: string): Promise<DeleteEncounterResult> {
        const encounterObjectId = Types.ObjectId.isValid(encounterId) ? new Types.ObjectId(encounterId) : null;
        const db = this.connection.db;
        if (!db) {
            throw new Error('Mongo database connection is not initialized');
        }

        const pendingIntentsResult = await this.getCollection(db, PENDING_INTENT_COLLECTION).deleteMany({
            encounterId,
        });
        const turnAdvanceRequestsResult = await this.getCollection(db, TURN_ADVANCE_REQUEST_COLLECTION).deleteMany({
            encounterId,
        });
        const turnEntropyResult = await this.getCollection(db, TURN_ENTROPY_COLLECTION).deleteMany({ encounterId });
        const turnInputFrozenResult = await this.getCollection(db, TURN_INPUT_FROZEN_COLLECTION).deleteMany({
            encounterId,
        });
        const eventStoreEventsResult = await this.getCollection(db, EVENT_STORE_EVENTS_COLLECTION).deleteMany({
            aggregateRootId: encounterId,
        });
        const eventStoreAggregateResult = await this.deleteById(db, EVENT_STORE_AGGREGATES_COLLECTION, encounterId);
        const encounterProjectionResult = await this.deleteById(db, ENCOUNTER_PROJECTION_COLLECTION, encounterId);

        const result: DeleteEncounterResult = {
            encounterId,
            deletedProjectionCount: encounterProjectionResult.deletedCount ?? 0,
            deletedPendingIntentCount: pendingIntentsResult.deletedCount ?? 0,
            deletedTurnAdvanceRequestCount: turnAdvanceRequestsResult.deletedCount ?? 0,
            deletedTurnEntropyCount: turnEntropyResult.deletedCount ?? 0,
            deletedTurnInputFrozenCount: turnInputFrozenResult.deletedCount ?? 0,
            deletedEventCount: eventStoreEventsResult.deletedCount ?? 0,
            deletedAggregateCount: eventStoreAggregateResult.deletedCount ?? 0,
        };

        const totalDeleted =
            result.deletedProjectionCount +
            result.deletedPendingIntentCount +
            result.deletedTurnAdvanceRequestCount +
            result.deletedTurnEntropyCount +
            result.deletedTurnInputFrozenCount +
            result.deletedEventCount +
            result.deletedAggregateCount;

        if (totalDeleted === 0) {
            throw new NotFoundException(`Encounter with id ${encounterId} not found`);
        }

        return result;
    }

    private async deleteById(
        db: MongoDbHandle,
        collectionName: string,
        encounterId: string,
    ): Promise<DeleteByIdResult> {
        const collection = this.getCollection(db, collectionName);
        const deleteByStringResult = await collection.deleteOne({ _id: encounterId } as never);
        if (deleteByStringResult.deletedCount) {
            return deleteByStringResult;
        }

        if (!Types.ObjectId.isValid(encounterId)) {
            return deleteByStringResult;
        }

        return collection.deleteOne({ _id: new Types.ObjectId(encounterId) } as never);
    }

    private getCollection(db: MongoDbHandle, collectionName: string) {
        return db.collection<CleanupCollectionDocument>(collectionName);
    }
}
