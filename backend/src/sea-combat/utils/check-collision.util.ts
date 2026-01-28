import Vector from 'vector2js';

export const checkCollision = (
    pathA: Vector[],
    pathB: Vector[],
    roundLength: number,
) => {
    const timePerStepA = roundLength / pathA.length; // 4.0 сек
    const timePerStepB = roundLength / pathB.length; // ~2.857 сек

    for (let i = 0; i < pathA.length; i++) {
        const aHex = pathA[i];
        const aStart = i * timePerStepA;
        const aEnd = (i + 1) * timePerStepA;

        for (let j = 0; j < pathB.length; j++) {
            const bHex = pathB[j];
            const bStart = j * timePerStepB;
            const bEnd = (j + 1) * timePerStepB;

            if (aHex[0] === bHex[0] && aHex[1] === bHex[1]) {
                // координаты совпадают
                const overlapStart = Math.max(aStart, bStart);
                const overlapEnd = Math.min(aEnd, bEnd);
                if (overlapStart < overlapEnd) {
                    return {
                        collision: true,
                        hex: aHex,
                        time: overlapStart.toFixed(3),
                    };
                }
            }
        }
    }

    return {
        collision: false,
        hex: null,
        time: null,
    };
};
