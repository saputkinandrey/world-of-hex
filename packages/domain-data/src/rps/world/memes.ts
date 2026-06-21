import memeWorldDataJson from "./data/memes.json";
import type { MorphId } from "./morphs";
import type { MemeWorldData } from "./entities";

export type MemeId = string;

export type MemeNode = {
    id: MemeId;
    parents?: MemeId[];
};

export const memeWorldDataFilePath =
    "packages/domain-data/src/rps/world/data/memes.json";

export const memeWorldData = memeWorldDataJson as MemeWorldData;

export const memes = memeWorldData.tree as any;

export const soc = memes.soc;
export const comm = memes.comm;
export const cog = memes.cog;
export const org = memes.org;
export const tech = memes.tech;
export const fire = tech.fire;
export const heat = tech.heat;
export const food = tech.food;
export const culinary = food.culinary;
export const health = memes.health;
export const culture = memes.culture;
export const record = memes.record;
export const law = memes.law;
export const econ = memes.econ;

export const memeDeps = memeWorldData.dependencies as Record<
    MemeId,
    readonly (MemeId | MorphId)[]
>;

export function expandMemes(required: Iterable<MemeId>): Set<MemeId> {
    const need = new Set<MemeId>();
    const stack: MemeId[] = [...required];
    while (stack.length) {
        const meme = stack.pop()!;
        if (need.has(meme)) continue;
        need.add(meme);
        for (const parent of memeDeps[meme] ?? []) stack.push(parent);
    }
    return need;
}

export function canPerform(
    known: Set<MemeId>,
    required: Iterable<MemeId>,
): boolean {
    for (const meme of expandMemes(required))
        if (!known.has(meme)) return false;
    return true;
}
