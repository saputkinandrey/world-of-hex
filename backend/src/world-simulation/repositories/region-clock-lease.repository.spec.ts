import { RegionClockLeaseRepository } from './region-clock-lease.repository';

describe('RegionClockLeaseRepository', () => {
    it('creates a lease when none exists', async () => {
        const created = { regionId: 'r1', fence: '1', ownerId: 'owner-a' };
        const findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
        const create = jest.fn().mockResolvedValue(created);
        const repo = new RegionClockLeaseRepository({ findOne, create } as never);

        const lease = await repo.acquire({
            regionId: 'r1',
            ownerId: 'owner-a',
            ttlMs: 30_000,
            now: new Date('2026-01-01T00:00:00.000Z'),
        });

        expect(lease).toBe(created);
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                regionId: 'r1',
                ownerId: 'owner-a',
                fence: '1',
            }),
        );
    });

    it('rejects acquire when another owner holds a non-expired lease', async () => {
        const existing = {
            regionId: 'r1',
            ownerId: 'owner-a',
            fence: '3',
            expiresAt: new Date('2026-01-01T00:01:00.000Z'),
        };
        const findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) });
        const findOneAndUpdate = jest.fn();
        const repo = new RegionClockLeaseRepository({ findOne, findOneAndUpdate } as never);

        const lease = await repo.acquire({
            regionId: 'r1',
            ownerId: 'owner-b',
            ttlMs: 30_000,
            now: new Date('2026-01-01T00:00:30.000Z'),
        });

        expect(lease).toBeNull();
        expect(findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('increments fence when reclaiming an expired lease', async () => {
        const existing = {
            regionId: 'r1',
            ownerId: 'owner-a',
            fence: '3',
            expiresAt: new Date('2026-01-01T00:00:10.000Z'),
        };
        const updated = { ...existing, ownerId: 'owner-b', fence: '4' };
        const findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) });
        const findOneAndUpdate = jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(updated),
        });
        const repo = new RegionClockLeaseRepository({ findOne, findOneAndUpdate } as never);

        const lease = await repo.acquire({
            regionId: 'r1',
            ownerId: 'owner-b',
            ttlMs: 30_000,
            now: new Date('2026-01-01T00:00:30.000Z'),
        });

        expect(lease).toBe(updated);
        expect(findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                regionId: 'r1',
                fence: '3',
            }),
            expect.objectContaining({
                $set: expect.objectContaining({
                    ownerId: 'owner-b',
                    fence: '4',
                }),
            }),
            { new: true },
        );
    });
});
