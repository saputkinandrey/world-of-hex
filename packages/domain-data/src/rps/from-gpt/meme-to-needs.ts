import type { MemeId } from "../world/memes";
import { worldTraitNeedImpacts } from "./need-impacts";
import type { MemeNeedImpact } from "./needs";

export const MemeToNeeds = worldTraitNeedImpacts as Record<
    MemeId,
    MemeNeedImpact
>;
