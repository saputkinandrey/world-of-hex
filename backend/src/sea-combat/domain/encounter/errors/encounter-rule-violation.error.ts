export class EncounterRuleViolationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = EncounterRuleViolationError.name;
    }
}
