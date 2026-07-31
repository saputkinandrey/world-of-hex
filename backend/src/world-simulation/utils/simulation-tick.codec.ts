export const SIMULATION_TICK_WIDTH = 30;

export type SimulationTick = string;

export class SimulationTickCodecError extends Error {
    constructor(message: string) {
        super(message);
        this.name = SimulationTickCodecError.name;
    }
}

const DIGITS_ONLY = /^\d+$/;

export const formatSimulationTick = (value: bigint): SimulationTick => {
    if (typeof value !== 'bigint') {
        throw new SimulationTickCodecError('Simulation tick value must be a bigint.');
    }

    if (value < 0n) {
        throw new SimulationTickCodecError(`Simulation tick must be non-negative: ${value.toString()}`);
    }

    const digits = value.toString(10);
    if (digits.length > SIMULATION_TICK_WIDTH) {
        throw new SimulationTickCodecError(`Simulation tick exceeds max width ${SIMULATION_TICK_WIDTH}: ${digits}`);
    }

    return digits.padStart(SIMULATION_TICK_WIDTH, '0');
};

export const parseSimulationTick = (value: string): bigint => {
    if (typeof value !== 'string' || value.length === 0) {
        throw new SimulationTickCodecError('Simulation tick must be a non-empty decimal string.');
    }

    if (!DIGITS_ONLY.test(value)) {
        throw new SimulationTickCodecError(`Simulation tick must contain only digits: ${value}`);
    }

    if (value.length > SIMULATION_TICK_WIDTH) {
        throw new SimulationTickCodecError(`Simulation tick exceeds max width ${SIMULATION_TICK_WIDTH}: ${value}`);
    }

    const parsed = BigInt(value);
    const canonical = formatSimulationTick(parsed);

    if (value.length === SIMULATION_TICK_WIDTH && value !== canonical) {
        throw new SimulationTickCodecError(`Simulation tick is not canonical: ${value}`);
    }

    return parsed;
};

export const normalizeSimulationTick = (value: string): SimulationTick => {
    return formatSimulationTick(parseSimulationTick(value));
};

export const compareSimulationTicks = (a: string, b: string): number => {
    const left = parseSimulationTick(a);
    const right = parseSimulationTick(b);
    if (left < right) {
        return -1;
    }
    if (left > right) {
        return 1;
    }
    return 0;
};

export const incrementSimulationTick = (value: string): SimulationTick => {
    return formatSimulationTick(parseSimulationTick(value) + 1n);
};
