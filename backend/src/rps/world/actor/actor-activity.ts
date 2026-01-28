// world/actor-activity.ts

import { ActorEntity } from './actor.entity';
import { ActivityId } from './types';

/**
 * Общий интерфейс стратегии активности.
 *
 * Strategy / State в чистом виде:
 *  - onEnter    — вызывается один раз при входе в состояние;
 *  - advance    — вызывается каждый "шаг времени";
 *  - onExit     — вызывается при выходе из состояния (опционально).
 *
 * Стратегия сама решает:
 *  - как использовать remainingSeconds;
 *  - как менять posture, нужды, метаболизм и т.п.
 */
export interface ActorStateStrategy {
    /** Какому ActivityId соответствует эта стратегия. */
    readonly id: ActivityId;
    remainingSeconds: number;

    /**
     * Вход в состояние.
     * durationSeconds — сколько времени актор планирует провести в этой активности.
     */
    onEnter?(actor: ActorEntity, durationSeconds: number): void;

    /**
     * Шаг симуляции внутри этого состояния.
     *
     * deltaSeconds — "сколько времени прошло" в секундах.
     *
     * Стратегия может:
     *  - уменьшать state.remainingSeconds;
     *  - обновлять нужды/метаболизм/позу актёра;
     *  - по своему усмотрению решать, когда считать состояние завершённым.
     *
     * Возвращает:
     *  - true  — если состояние нужно завершить (перейти в idle);
     *  - false — если продолжаем оставаться в этой активности.
     */
    advance(actor: ActorEntity, deltaSeconds: number): boolean;

    /**
     * Выход из состояния (опционально).
     */
    onExit?(actor: ActorEntity): void;
}
