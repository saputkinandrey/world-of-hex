/**
 * Идентификатор активности.
 *
 * Важно: набор допустимых ActivityId зависит от линз/морфов.
 *  - живые существа с LivingCreatureLens могут иметь 'eat'/'drink'/'sleep';
 *  - големы/нежить — нет, им просто не навешиваем такие активности.
 */
export type ActivityId =
    | 'idle'
    | 'eat'
    | 'drink'
    | 'sleep'
// дальше можно добавлять 'move', 'fight', 'cast_spell' и т.п.
    ;

/**
 * Состояние активности:
 *  - id               — тип активности
 *  - remainingSeconds — сколько ещё времени актор планирует оставаться в ней
 *    (для idle = 0, для "бесконечных" режимов можно использовать Infinity).
 */
export interface ActorActivityState {
    id: ActivityId;
    remainingSeconds: number;
}

export type PostureTag = string;
