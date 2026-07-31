import { Injectable } from '@nestjs/common';

@Injectable()
export class WorldSimulationMetricsService {
    private readonly counters = new Map<string, number>();
    private readonly durations = new Map<string, number[]>();

    increment(name: string, by = 1) {
        this.counters.set(name, (this.counters.get(name) ?? 0) + by);
    }

    observeDuration(name: string, valueMs: number) {
        const values = this.durations.get(name) ?? [];
        values.push(valueMs);
        if (values.length > 1000) {
            values.shift();
        }
        this.durations.set(name, values);
    }

    snapshot() {
        return {
            counters: Object.fromEntries(this.counters.entries()),
            durations: Object.fromEntries(
                [...this.durations.entries()].map(([name, values]) => [
                    name,
                    {
                        count: values.length,
                        last: values[values.length - 1] ?? null,
                    },
                ]),
            ),
        };
    }
}
