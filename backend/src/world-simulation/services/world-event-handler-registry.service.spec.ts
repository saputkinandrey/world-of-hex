import { WorldEventHandlerRegistryService } from './world-event-handler-registry.service';
import { NoopWorldEventHandler } from '../handlers/noop-world-event.handler';
import { formatSimulationTick, incrementSimulationTick } from '../utils/simulation-tick.codec';

describe('NoopWorldEventHandler and registry', () => {
    it('registers and resolves noop handler', async () => {
        const registry = new WorldEventHandlerRegistryService();
        const handler = new NoopWorldEventHandler();
        registry.register(handler);

        const resolved = registry.get('world.noop', 1);
        const tick = formatSimulationTick(1n);
        const result = await resolved.handle({
            eventId: 'e1',
            regionId: 'r1',
            tick,
            microstep: 0,
            correlationId: 'c1',
            payload: { emitSameTick: true, emitFutureTickOffset: 10 },
        });

        let futureTick = tick;
        for (let i = 0; i < 10; i += 1) {
            futureTick = incrementSimulationTick(futureTick);
        }

        expect(result.emittedWorldEvents).toHaveLength(2);
        expect(result.emittedWorldEvents?.[0]).toEqual(
            expect.objectContaining({
                scheduledTick: tick,
                microstep: 1,
            }),
        );
        expect(result.emittedWorldEvents?.[1]).toEqual(
            expect.objectContaining({
                scheduledTick: futureTick,
                microstep: 0,
            }),
        );
    });
});
