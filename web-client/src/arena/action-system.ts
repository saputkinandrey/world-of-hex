export interface ActionRuntimeState {
    definitionId: string;
    startedAt: number;
    updatedAt: number;
}

export interface ActionCandidate<TResult, TState> {
    result: TResult;
    nextState: TState;
}

export interface ActionDefinition<TContext, TResult, TState> {
    id: string;
    priority: number;
    createCandidate: (
        context: TContext,
    ) => ActionCandidate<TResult, TState> | null;
}

export interface ActionSelection<TResult, TState> {
    definitionId: string;
    result: TResult;
    nextState: TState;
}

export const selectAction = <TContext, TResult, TState>(
    definitions: ReadonlyArray<ActionDefinition<TContext, TResult, TState>>,
    context: TContext,
): ActionSelection<TResult, TState> | null => {
    const orderedDefinitions = [...definitions].sort(
        (left, right) =>
            right.priority - left.priority || left.id.localeCompare(right.id),
    );

    for (const definition of orderedDefinitions) {
        const candidate = definition.createCandidate(context);
        if (candidate) {
            return {
                definitionId: definition.id,
                result: candidate.result,
                nextState: candidate.nextState,
            };
        }
    }

    return null;
};
