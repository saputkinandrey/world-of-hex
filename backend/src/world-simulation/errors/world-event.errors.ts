export class RetryableWorldEventError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = RetryableWorldEventError.name;
        this.code = code;
    }
}

export class TerminalWorldEventError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = TerminalWorldEventError.name;
        this.code = code;
    }
}

export class RegionFaultWorldEventError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = RegionFaultWorldEventError.name;
        this.code = code;
    }
}

export class AlreadyAppliedWorldEventError extends Error {
    readonly code: string;

    constructor(sourceWorldEventId: string) {
        super(`World event ${sourceWorldEventId} was already applied.`);
        this.name = AlreadyAppliedWorldEventError.name;
        this.code = 'already_applied';
    }
}
