export class StreamAwareEntity {
    streamId?: string;
    ownerKey?: string | null;
    entityIdKey?: string | null;

    setStreamId(streamId: string) {
        this.streamId = streamId;
        return this;
    }

    setOwnerKey(ownerKey: string | null, entityIdKey?: string | null) {
        this.ownerKey = ownerKey;
        this.entityIdKey = entityIdKey === undefined ? ownerKey : entityIdKey;
        return this;
    }
}
