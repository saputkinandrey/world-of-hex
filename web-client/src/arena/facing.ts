import { NEIGHBOR_OFFSETS, toMeters } from "./arena";
import type { HexCoord, Team } from "./model";

export const getInitialBodyFacing = (team: Team): HexCoord =>
    team === "blue" ? { q: 1, r: 0 } : { q: -1, r: 0 };

export const getFacingToward = (
    origin: HexCoord,
    destination: HexCoord,
    fallback: HexCoord,
): HexCoord => {
    if (origin.q === destination.q && origin.r === destination.r) {
        return fallback;
    }
    const originMeters = toMeters(origin);
    const destinationMeters = toMeters(destination);
    const direction = {
        x: destinationMeters.x - originMeters.x,
        y: destinationMeters.y - originMeters.y,
    };

    return [...NEIGHBOR_OFFSETS].sort((left, right) => {
        const leftMeters = toMeters(left);
        const rightMeters = toMeters(right);
        const leftDot = leftMeters.x * direction.x + leftMeters.y * direction.y;
        const rightDot =
            rightMeters.x * direction.x + rightMeters.y * direction.y;
        return rightDot - leftDot;
    })[0];
};

export const isInFrontVisualArc = (
    observerPosition: HexCoord,
    bodyFacing: HexCoord,
    targetPosition: HexCoord,
): boolean => {
    const observerMeters = toMeters(observerPosition);
    const targetMeters = toMeters(targetPosition);
    const facingMeters = toMeters(bodyFacing);
    const targetDirection = {
        x: targetMeters.x - observerMeters.x,
        y: targetMeters.y - observerMeters.y,
    };
    return (
        facingMeters.x * targetDirection.x +
            facingMeters.y * targetDirection.y >=
        0
    );
};
