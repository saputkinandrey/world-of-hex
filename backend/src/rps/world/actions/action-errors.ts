// rps/actions/action-errors.ts

import type { ActionTag } from './action-tags';

/**
 * Специальная ошибка: "экшен НЕ МОЖЕТ быть начат в текущем состоянии".
 *
 * Важное семантическое отличие от обычного Error:
 *  - это НЕ баг кодовой логики,
 *  - это нормальный, ожидаемый отказ во входе,
 *  - планировщик должен:
 *      * не падать,
 *      * пометить этот экшен как "не брать сейчас",
 *      * перейти к выбору другого экшена.
 */
export class ActionEnterRejectedError extends Error {
    public readonly actionTag: ActionTag;
    public readonly reason: string;
    public readonly details?: unknown;

    constructor(actionTag: ActionTag, reason: string, details?: unknown) {
        super(`[ActionEnterRejected] ${String(actionTag)}: ${reason}`);
        this.name = 'ActionEnterRejectedError';
        this.actionTag = actionTag;
        this.reason = reason;
        this.details = details;
    }
}
