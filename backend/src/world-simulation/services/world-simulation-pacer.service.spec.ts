import { WorldSimulationPacerService } from './world-simulation-pacer.service';
import { RegionClockStatus } from '../domain/region-clock/region-clock.types';

describe('WorldSimulationPacerService', () => {
    it('enqueues at most one heartbeat per running region without open execution', async () => {
        const enqueueHeartbeat = jest.fn().mockResolvedValue({});
        const service = new WorldSimulationPacerService(
            {
                findRunning: jest
                    .fn()
                    .mockResolvedValueOnce([
                        { regionId: 'r1', status: RegionClockStatus.RUNNING, currentTick: '0' },
                        { regionId: 'r2', status: RegionClockStatus.RUNNING, currentTick: '0' },
                    ])
                    .mockResolvedValue([]),
            } as never,
            {
                findOpenByRegionId: jest
                    .fn()
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({ executionId: 'open' }),
            } as never,
            {
                hasActiveOrWaitingHeartbeat: jest.fn().mockResolvedValue(false),
                enqueueHeartbeat,
            } as never,
        );

        await service.offerHeartbeatPermits();

        expect(enqueueHeartbeat).toHaveBeenCalledTimes(1);
        expect(enqueueHeartbeat).toHaveBeenCalledWith({
            regionId: 'r1',
            requestedFrom: 'pacer',
        });
    });

    it('does not enqueue when heartbeat job already exists', async () => {
        const enqueueHeartbeat = jest.fn();
        const service = new WorldSimulationPacerService(
            {
                findRunning: jest
                    .fn()
                    .mockResolvedValue([{ regionId: 'r1', status: RegionClockStatus.RUNNING, currentTick: '0' }]),
            } as never,
            { findOpenByRegionId: jest.fn().mockResolvedValue(null) } as never,
            {
                hasActiveOrWaitingHeartbeat: jest.fn().mockResolvedValue(true),
                enqueueHeartbeat,
            } as never,
        );

        await service.offerHeartbeatPermits();
        expect(enqueueHeartbeat).not.toHaveBeenCalled();
    });
});
