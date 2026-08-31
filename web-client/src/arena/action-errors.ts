export class ActionEnterRejectedError extends Error {
    public readonly actionId: string;
    public readonly reason: string;
    public readonly details?: unknown;

    constructor(actionId: string, reason: string, details?: unknown) {
        super(`[ActionEnterRejected] ${actionId}: ${reason}`);
        this.name = "ActionEnterRejectedError";
        this.actionId = actionId;
        this.reason = reason;
        this.details = details;
    }
}
