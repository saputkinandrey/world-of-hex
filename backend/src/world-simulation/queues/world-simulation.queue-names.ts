export const WORLD_SIMULATION_REGION_QUEUE_PREFIX = 'world-simulation-region';

export const regionQueueName = (regionId: string): string => {
    if (typeof regionId !== 'string' || regionId.length === 0) {
        throw new Error('regionId is required to build a region queue name.');
    }
    if (regionId.includes(':')) {
        throw new Error(`regionId must not contain ':': ${regionId}`);
    }
    return `${WORLD_SIMULATION_REGION_QUEUE_PREFIX}:${regionId}`;
};

export const parseRegionIdFromQueueName = (queueName: string): string | null => {
    const prefix = `${WORLD_SIMULATION_REGION_QUEUE_PREFIX}:`;
    if (!queueName.startsWith(prefix)) {
        return null;
    }
    const regionId = queueName.slice(prefix.length);
    return regionId.length > 0 ? regionId : null;
};
