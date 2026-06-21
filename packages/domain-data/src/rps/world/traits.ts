import traitWorldDataJson from "./data/traits.json";
import type { TraitWorldData } from "./entities";

export type TraitId = string;

export const traitWorldDataFilePath =
    "packages/domain-data/src/rps/world/data/traits.json";

export const traitWorldData = traitWorldDataJson as TraitWorldData;

export const traits = traitWorldData.tree as any;
