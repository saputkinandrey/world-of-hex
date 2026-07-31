export class RegionClockDomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = RegionClockDomainError.name;
    }
}
