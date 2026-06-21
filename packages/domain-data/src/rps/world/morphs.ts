import morphWorldDataJson from "./data/morphs.json";
import type { MorphWorldData } from "./entities";

export type MorphId = string;

export type LeveledMorphTemplateId = `${string}.%level%`;

export const morphWorldDataFilePath =
    "packages/domain-data/src/rps/world/data/morphs.json";

export const morphWorldData = morphWorldDataJson as MorphWorldData;

export const morph = morphWorldData.tree as any;

export const core = morph.core;
export const IQ2 = morph.cognition.iq.iq2;
export const IQ3 = morph.cognition.iq.iq3;
export const IQ4 = morph.cognition.iq.iq4;
export const IQ5 = morph.cognition.iq.iq5;
export const IQ6 = morph.cognition.iq.iq6;
export const IQ7 = morph.cognition.iq.iq7;
export const IQ8 = morph.cognition.iq.iq8;
export const IQ9 = morph.cognition.iq.iq9;
export const IQ10 = morph.cognition.iq.iq10;

export function leveledMorph(
    template: LeveledMorphTemplateId,
    level: number,
): MorphId {
    const safeLevel =
        Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
    return template.replace("%level%", String(safeLevel)) as MorphId;
}

export function leveledMorphPrefix(template: LeveledMorphTemplateId): string {
    return template.replace("%level%", "");
}

export function isMorphOfTemplate(
    id: MorphId,
    template: LeveledMorphTemplateId,
): boolean {
    return id.startsWith(leveledMorphPrefix(template));
}

export function getLeveledMorphLevel(
    id: MorphId,
    template?: LeveledMorphTemplateId,
): number | null {
    if (template && !id.startsWith(leveledMorphPrefix(template))) {
        return null;
    }

    const lastDot = id.lastIndexOf(".");
    if (lastDot === -1 || lastDot === id.length - 1) return null;

    const tail = id.slice(lastDot + 1);
    const num = Number.parseInt(tail, 10);
    if (!Number.isFinite(num)) return null;

    return num;
}

export function morphLvl(id: MorphId | null | undefined): number {
    if (!id) return 0;
    const level = getLeveledMorphLevel(id);
    return level ?? 0;
}
