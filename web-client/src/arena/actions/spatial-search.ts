import { getFacingToward } from "../facing";
import type { HexCoord } from "../model";
import type { SearchSweepInput } from "./spatial-search.types";

export const getSearchSweepFacingTarget = ({
    position,
    bodyFacing,
    searchCenter,
    sweepStep,
    neighborOffsets,
    directionOffsets,
}: SearchSweepInput): HexCoord => {
    if (neighborOffsets.length === 0) {
        throw new Error("Search sweep requires neighbor offsets.");
    }
    if (directionOffsets.length === 0) {
        throw new Error("Search sweep requires direction offsets.");
    }

    const initialFacing = getFacingToward(
        position,
        searchCenter,
        bodyFacing,
    );
    const initialFacingIndex = neighborOffsets.findIndex(
        (offset) =>
            offset.q === initialFacing.q && offset.r === initialFacing.r,
    );
    if (initialFacingIndex < 0) {
        throw new Error("Initial search facing is not a neighbor offset.");
    }

    const normalizedSweepStep = Math.max(0, Math.floor(sweepStep));
    const directionOffset =
        directionOffsets[normalizedSweepStep % directionOffsets.length];
    const directionIndex =
        ((initialFacingIndex + directionOffset) % neighborOffsets.length +
            neighborOffsets.length) %
        neighborOffsets.length;
    const direction = neighborOffsets[directionIndex];
    return {
        q: position.q + direction.q,
        r: position.r + direction.r,
    };
};
