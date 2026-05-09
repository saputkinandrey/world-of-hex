import { Direction } from '../types/direction.type';
import { buildEncounterMovementPreview } from './encounter-movement-preview.util';

describe('buildEncounterMovementPreview', () => {
    it('does not report a crossing when ships only pass through the same hex at different times', () => {
        const preview = buildEncounterMovementPreview({
            center: { x: 0, y: 0 },
            radius: 12,
            ships: [
                {
                    shipId: 'ship-slow',
                    shipName: 'Ashen Tide',
                    position: { x: 0, y: 2 },
                    direction: Direction.N,
                    speed: 1,
                },
                {
                    shipId: 'ship-fast',
                    shipName: 'The Glass Wyrm',
                    position: { x: 0, y: 0 },
                    direction: Direction.S,
                    speed: 2,
                },
            ],
        });

        expect(preview.predictedCrossings).toEqual([]);
        expect(preview.projectedTrajectories).toEqual([
            {
                shipId: 'ship-slow',
                shipName: 'Ashen Tide',
                points: [
                    { x: 0, y: 2 },
                    { x: 0, y: 1 },
                ],
                stepPositions: [...Array.from({ length: 19 }, () => ({ x: 0, y: 2 })), { x: 0, y: 1 }],
                nextStartPosition: { x: 0, y: 1 },
            },
            {
                shipId: 'ship-fast',
                shipName: 'The Glass Wyrm',
                points: [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: 2 },
                ],
                stepPositions: [
                    ...Array.from({ length: 9 }, () => ({ x: 0, y: 0 })),
                    ...Array.from({ length: 10 }, () => ({ x: 0, y: 1 })),
                    { x: 0, y: 2 },
                ],
                nextStartPosition: { x: 0, y: 2 },
            },
        ]);
    });

    it('reports the first timed crossing and stops projected movement there', () => {
        const preview = buildEncounterMovementPreview({
            center: { x: 0, y: 0 },
            radius: 12,
            ships: [
                {
                    shipId: 'ship-a',
                    shipName: 'Ashen Tide',
                    position: { x: 0, y: 0 },
                    direction: Direction.S,
                    speed: 1,
                },
                {
                    shipId: 'ship-b',
                    shipName: 'The Glass Wyrm',
                    position: { x: 0, y: 2 },
                    direction: Direction.N,
                    speed: 1,
                },
            ],
        });

        expect(preview.predictedCrossings).toEqual([
            {
                substep: 20,
                point: { x: 0, y: 1 },
                shipIds: ['ship-a', 'ship-b'],
                shipNames: ['Ashen Tide', 'The Glass Wyrm'],
            },
        ]);
        expect(preview.projectedTrajectories).toEqual([
            {
                shipId: 'ship-a',
                shipName: 'Ashen Tide',
                points: [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                ],
                stepPositions: [...Array.from({ length: 19 }, () => ({ x: 0, y: 0 })), { x: 0, y: 1 }],
                nextStartPosition: { x: 0, y: 1 },
            },
            {
                shipId: 'ship-b',
                shipName: 'The Glass Wyrm',
                points: [
                    { x: 0, y: 2 },
                    { x: 0, y: 1 },
                ],
                stepPositions: [...Array.from({ length: 19 }, () => ({ x: 0, y: 2 })), { x: 0, y: 1 }],
                nextStartPosition: { x: 0, y: 1 },
            },
        ]);
    });
});
