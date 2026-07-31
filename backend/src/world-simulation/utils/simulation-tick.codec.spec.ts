import {
    compareSimulationTicks,
    formatSimulationTick,
    incrementSimulationTick,
    normalizeSimulationTick,
    parseSimulationTick,
    SIMULATION_TICK_WIDTH,
    SimulationTickCodecError,
} from './simulation-tick.codec';

describe('simulation-tick.codec', () => {
    it('formats ticks as fixed-width zero-padded decimal strings', () => {
        expect(formatSimulationTick(0n)).toBe('0'.repeat(SIMULATION_TICK_WIDTH));
        expect(formatSimulationTick(1n)).toBe(`${'0'.repeat(SIMULATION_TICK_WIDTH - 1)}1`);
        expect(formatSimulationTick(864000n)).toHaveLength(SIMULATION_TICK_WIDTH);
    });

    it('parses unpadded and canonical tick strings', () => {
        expect(parseSimulationTick('0')).toBe(0n);
        expect(parseSimulationTick('42')).toBe(42n);
        expect(parseSimulationTick(formatSimulationTick(42n))).toBe(42n);
    });

    it('normalizes ticks to canonical fixed-width form', () => {
        expect(normalizeSimulationTick('7')).toBe(formatSimulationTick(7n));
    });

    it('orders fixed-width ticks lexicographically the same as numeric order', () => {
        const ticks = [100n, 2n, 20n, 0n, 1000n].map(formatSimulationTick).sort();
        expect(ticks.map(parseSimulationTick)).toEqual([0n, 2n, 20n, 100n, 1000n]);
    });

    it('compares and increments ticks without using JS number', () => {
        expect(compareSimulationTicks('9', '10')).toBe(-1);
        expect(compareSimulationTicks('10', '10')).toBe(0);
        expect(compareSimulationTicks('11', '10')).toBe(1);
        expect(incrementSimulationTick('9')).toBe(formatSimulationTick(10n));
    });

    it('rejects invalid tick strings', () => {
        expect(() => parseSimulationTick('')).toThrow(SimulationTickCodecError);
        expect(() => parseSimulationTick('-1')).toThrow(SimulationTickCodecError);
        expect(() => parseSimulationTick('1.5')).toThrow(SimulationTickCodecError);
        expect(() => parseSimulationTick('abc')).toThrow(SimulationTickCodecError);
        expect(() => formatSimulationTick(-1n)).toThrow(SimulationTickCodecError);
    });
});
