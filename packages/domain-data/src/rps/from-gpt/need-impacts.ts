import morphNeedImpactsJson from "./data/need-impacts/morphs.json";
import memeNeedImpactsJson from "./data/need-impacts/memes.json";
import traitNeedImpactsJson from "./data/need-impacts/traits.json";
import deferredNeedImpactsJson from "./data/need-impacts/deferred.json";
import type { MemeNeedImpact } from "./needs";
import type {
    DeferredNeedImpactData,
    NeedImpactData,
    NeedImpactSourceKind,
} from "./entities";

export const morphNeedImpacts = morphNeedImpactsJson as unknown as Record<
    string,
    MemeNeedImpact
>;

export const memeNeedImpacts = memeNeedImpactsJson as unknown as Record<
    string,
    MemeNeedImpact
>;

export const traitNeedImpacts = traitNeedImpactsJson as unknown as Record<
    string,
    MemeNeedImpact
>;

export const deferredNeedImpacts =
    deferredNeedImpactsJson as DeferredNeedImpactData[];

export const needImpactsBySourceKind: Record<
    NeedImpactSourceKind,
    Record<string, NeedImpactData>
> = {
    morph: morphNeedImpacts,
    meme: memeNeedImpacts,
    trait: traitNeedImpacts,
};

export const worldTraitNeedImpacts: Record<string, MemeNeedImpact> = {
    ...morphNeedImpacts,
    ...memeNeedImpacts,
    ...traitNeedImpacts,
};
