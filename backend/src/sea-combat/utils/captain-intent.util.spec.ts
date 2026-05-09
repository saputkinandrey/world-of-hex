import { PendingShipIntentType } from '../types/pending-intent.type';
import { ShipCaptainTargetType } from '../types/ship-captain-target.type';
import { Direction } from '../types/direction.type';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { deriveCaptainShipOrders } from './captain-intent.util';

describe('deriveCaptainShipOrders', () => {
    it('prefers acceleration for circle when the ship is moving too slowly', () => {
        const orders = deriveCaptainShipOrders({
            captainIntent: ShipEncounterIntent.CIRCLE,
            ship: {
                shipId: 'ship-a',
                position: { q: 0, r: 0 },
                direction: Direction.N,
                speed: 0,
            },
            target: {
                type: ShipCaptainTargetType.NEAREST_ENEMY,
                shipId: null,
            },
            otherShips: [
                {
                    shipId: 'ship-b',
                    position: { q: 0, r: -3 },
                    direction: Direction.S,
                    speed: 2,
                },
            ],
        });

        expect(orders).toEqual({
            captainIntent: ShipEncounterIntent.CIRCLE,
            targetShipId: 'ship-b',
            helmsmanIntent: PendingShipIntentType.HELMSMAN_FORWARD,
            boatswainIntent: PendingShipIntentType.BOATSWAIN_ACCELERATE,
        });
    });

    it('uses a specific ship target even when another ship is nearer', () => {
        const orders = deriveCaptainShipOrders({
            captainIntent: ShipEncounterIntent.PURSUE,
            ship: {
                shipId: 'ship-a',
                position: { q: 0, r: 0 },
                direction: Direction.N,
                speed: 2,
            },
            target: {
                type: ShipCaptainTargetType.SPECIFIC_SHIP,
                shipId: 'ship-b',
            },
            otherShips: [
                {
                    shipId: 'ship-b',
                    position: { q: 0, r: -4 },
                    direction: Direction.S,
                    speed: 2,
                },
                {
                    shipId: 'ship-c',
                    position: { q: 1, r: 0 },
                    direction: Direction.N,
                    speed: 2,
                },
            ],
        });

        expect(orders.targetShipId).toBe('ship-b');
    });
});
