export type RegionHeartbeatRequestedFrom = 'pacer' | 'recovery' | 'admin';

export type RegionHeartbeatJob = {
    regionId: string;
    requestedFrom: RegionHeartbeatRequestedFrom;
};

export const regionHeartbeatJobId = (regionId: string) => `region-heartbeat:${regionId}`;
