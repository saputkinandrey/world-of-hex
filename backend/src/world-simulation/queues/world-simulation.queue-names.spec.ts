import { regionQueueName, parseRegionIdFromQueueName } from './world-simulation.queue-names';

describe('world-simulation.queue-names', () => {
    it('builds a per-region queue name', () => {
        expect(regionQueueName('nordmark')).toBe('world-simulation-region:nordmark');
    });

    it('parses region id back from queue name', () => {
        expect(parseRegionIdFromQueueName('world-simulation-region:nordmark')).toBe('nordmark');
        expect(parseRegionIdFromQueueName('other')).toBeNull();
    });

    it('rejects empty or colon-containing region ids', () => {
        expect(() => regionQueueName('')).toThrow();
        expect(() => regionQueueName('a:b')).toThrow();
    });
});
