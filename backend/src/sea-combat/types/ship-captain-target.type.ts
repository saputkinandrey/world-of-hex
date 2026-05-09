export enum ShipCaptainTargetType {
    SPECIFIC_SHIP = 'specific-ship',
    NEAREST_ENEMY = 'nearest-enemy',
    ENEMY_CENTER_OF_MASS = 'enemy-center-of-mass',
}

export type ShipCaptainTarget = {
    type: ShipCaptainTargetType;
    shipId: string | null;
};

export const DEFAULT_SHIP_CAPTAIN_TARGET: ShipCaptainTarget = {
    type: ShipCaptainTargetType.NEAREST_ENEMY,
    shipId: null,
};

export const createShipCaptainTarget = (
    type: ShipCaptainTargetType,
    shipId: string | null = null,
): ShipCaptainTarget => ({
    type,
    shipId: type === ShipCaptainTargetType.SPECIFIC_SHIP ? shipId : null,
});
