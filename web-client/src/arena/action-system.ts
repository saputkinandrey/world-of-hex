export interface ActionRuntimeState {
    definitionId: string;
    startedAt: number;
    updatedAt: number;
    completed?: boolean;
}

export interface ActionCondition<TContext> {
    id: string;
    isSatisfied: (context: TContext) => boolean;
}

export interface ActionLifecycleState {
    definitionId: string | null;
    completed: boolean;
}

export interface ActionCandidate<TResult, TState> {
    result: TResult;
    nextState: TState;
}

export interface ActionDefinition<TContext, TResult, TState> {
    id: string;
    priority: number;
    interruptsActiveAction?: boolean;
    getPriority?: (context: TContext) => number;
    enterConditions: ReadonlyArray<ActionCondition<TContext>>;
    exitConditions: ReadonlyArray<ActionCondition<TContext>>;
    onEnter?: (context: TContext) => void;
    perform: (context: TContext) => ActionCandidate<TResult, TState>;
    onExit?: (context: TContext) => void;
}

export interface FreeActionDefinition<TContext, TResult> {
    id: string;
    enterConditions: ReadonlyArray<FreeActionCondition<TContext, TResult>>;
    perform: (context: TContext, result: TResult) => TResult;
}

export interface FreeActionCondition<TContext, TResult> {
    id: string;
    isSatisfied: (context: TContext, result: TResult) => boolean;
}

export interface ActionSelection<TResult, TState> {
    definitionId: string;
    result: TResult;
    nextState: TState;
}

interface RankedActionDefinition<TContext, TResult, TState> {
    definition: ActionDefinition<TContext, TResult, TState>;
    definitionId: string;
    priority: number;
}

const conditionsAreSatisfied = <TContext>(
    conditions: ReadonlyArray<ActionCondition<TContext>>,
    context: TContext,
): boolean => conditions.every((condition) => condition.isSatisfied(context));

const isExpectedEntryRejection = (
    error: unknown,
): error is ActionEnterRejectedError =>
    error instanceof ActionEnterRejectedError;

export const selectAction = <TContext, TResult, TState>(
    definitions: ReadonlyArray<ActionDefinition<TContext, TResult, TState>>,
    context: TContext,
    lifecycle?: ActionLifecycleState,
): ActionSelection<TResult, TState> | null => {
    const activeDefinition = lifecycle?.definitionId
        ? definitions.find(
              (definition) => definition.id === lifecycle.definitionId,
          )
        : undefined;
    const interruptRequested = definitions.some(
        (definition) =>
            definition.id !== activeDefinition?.id &&
            definition.interruptsActiveAction === true &&
            conditionsAreSatisfied(definition.enterConditions, context),
    );
    if (
        activeDefinition &&
        !lifecycle?.completed &&
        !interruptRequested &&
        !conditionsAreSatisfied(activeDefinition.exitConditions, context)
    ) {
        try {
            const candidate = activeDefinition.perform(context);
            return {
                definitionId: activeDefinition.id,
                result: candidate.result,
                nextState: candidate.nextState,
            };
        } catch (error) {
            if (!isExpectedEntryRejection(error)) throw error;
        }
    }
    if (activeDefinition) activeDefinition.onExit?.(context);

    const ranked: RankedActionDefinition<TContext, TResult, TState>[] =
        definitions
            .filter((definition) =>
                conditionsAreSatisfied(definition.enterConditions, context),
            )
            .map((definition) => ({
                definition,
                definitionId: definition.id,
                priority:
                    definition.getPriority?.(context) ?? definition.priority,
            }));
    ranked.sort(
        (left, right) =>
            Number(right.definition.interruptsActiveAction === true) -
                Number(left.definition.interruptsActiveAction === true) ||
            right.priority - left.priority ||
            left.definitionId.localeCompare(right.definitionId),
    );

    for (const selected of ranked) {
        try {
            selected.definition.onEnter?.(context);
            const candidate = selected.definition.perform(context);
            return {
                definitionId: selected.definitionId,
                result: candidate.result,
                nextState: candidate.nextState,
            };
        } catch (error) {
            if (!isExpectedEntryRejection(error)) throw error;
        }
    }
    return null;
};

export const applyFreeActions = <TContext, TResult>(
    definitions: ReadonlyArray<FreeActionDefinition<TContext, TResult>>,
    context: TContext,
    result: TResult,
): TResult =>
    definitions.reduce(
        (current, definition) =>
            definition.enterConditions.every((condition) =>
                condition.isSatisfied(context, current),
            )
                ? definition.perform(context, current)
                : current,
        result,
    );
import { ActionEnterRejectedError } from "./action-errors";

export { ActionEnterRejectedError } from "./action-errors";
