export type ScheduleWorldEventInput = {
    eventId?: string;
    regionId: string;
    scheduledTick: string;
    type: string;
    schemaVersion?: number;
    payload: Record<string, unknown>;
    aggregateType?: string;
    aggregateId?: string;
    causationId?: string;
    correlationId: string;
    priority?: number;
    microstep?: number;
};

export type WorldEventHandlerContext<TPayload = Record<string, unknown>> = {
    eventId: string;
    regionId: string;
    tick: string;
    microstep: number;
    correlationId: string;
    causationId?: string;
    payload: TPayload;
};

export type WorldEventHandleResult = {
    emittedWorldEvents?: ScheduleWorldEventInput[];
};

export interface WorldEventHandler<TPayload = Record<string, unknown>> {
    readonly type: string;
    readonly schemaVersion: number;

    handle(context: WorldEventHandlerContext<TPayload>): Promise<WorldEventHandleResult>;
}
