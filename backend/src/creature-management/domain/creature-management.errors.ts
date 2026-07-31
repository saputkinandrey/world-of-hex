export class CreatureManagementDomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CreatureManagementDomainError';
    }
}

export class CreatureInstanceVersionConflictError extends Error {
    constructor(creatureInstanceId: string, expectedVersion: number) {
        super(
            `Creature instance ${creatureInstanceId} projection version conflict at expected version ${expectedVersion}`,
        );
        this.name = 'CreatureInstanceVersionConflictError';
    }
}

export class CreatureInstanceTimelineConflictError extends Error {
    constructor(creatureInstanceId: string, expectedTimelineVersion: number) {
        super(
            `Creature instance ${creatureInstanceId} timeline version conflict at expected version ${expectedTimelineVersion}`,
        );
        this.name = 'CreatureInstanceTimelineConflictError';
    }
}
