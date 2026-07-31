import morphWorldDataJson from "./data/morphs.json";
import type { MorphWorldData } from "./entities";

export type MorphId = string;

export type LeveledMorphTemplateId = `${string}.%level%`;

export const morphWorldDataFilePath =
    "packages/domain-data/src/rps/world/data/morphs.json";

export const morphWorldData = morphWorldDataJson as MorphWorldData;

export const morph = morphWorldData.tree as any;

export const core = morph.core;

export const IQ_MORPH_TEMPLATE =
    "morph.attribute.iq.%level%" as LeveledMorphTemplateId;
export const ST_ATTRIBUTE_MORPH_TEMPLATE =
    "morph.attribute.st.%level%" as LeveledMorphTemplateId;
export const DX0_ATTRIBUTE_MORPH = "morph.attribute.dx.0";
export const DX10_ATTRIBUTE_MORPH = "morph.attribute.dx.10";
export const DX_ATTRIBUTE_MORPH_IDS = [
    DX0_ATTRIBUTE_MORPH,
    DX10_ATTRIBUTE_MORPH,
] as const;
export const HT10_ATTRIBUTE_MORPH = "morph.attribute.ht.10";
export const IQ0 = leveledMorph(IQ_MORPH_TEMPLATE, 0);

export const IQ2 = leveledMorph(IQ_MORPH_TEMPLATE, 2);
export const IQ3 = leveledMorph(IQ_MORPH_TEMPLATE, 3);
export const IQ4 = leveledMorph(IQ_MORPH_TEMPLATE, 4);
export const IQ5 = leveledMorph(IQ_MORPH_TEMPLATE, 5);
export const IQ6 = leveledMorph(IQ_MORPH_TEMPLATE, 6);
export const IQ7 = leveledMorph(IQ_MORPH_TEMPLATE, 7);
export const IQ8 = leveledMorph(IQ_MORPH_TEMPLATE, 8);
export const IQ9 = leveledMorph(IQ_MORPH_TEMPLATE, 9);
export const IQ10 = leveledMorph(IQ_MORPH_TEMPLATE, 10);

export function leveledMorph(
    template: LeveledMorphTemplateId,
    level: number,
): MorphId {
    // Level 0 is valid for sessile/non-cognitive baselines (plant IQ).
    // ST also allows tenths (0.1..0.9) for insect-scale mass.
    if (!Number.isFinite(level) || level < 0) {
        return template.replace("%level%", "1") as MorphId;
    }
    const normalizedLevel = Math.round(level * 10) / 10;
    const levelText = Number.isInteger(normalizedLevel)
        ? String(normalizedLevel)
        : normalizedLevel.toFixed(1);
    return template.replace("%level%", levelText) as MorphId;
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

const LEVEL_SUFFIX_PATTERN = /(\d+\.\d+|\d+)$/;

export const parseLeveledMorphLevelSuffix = (
    morphId: string,
): { prefix: string; level: number } | null => {
    const match = morphId.match(LEVEL_SUFFIX_PATTERN);
    if (!match || match.index === undefined) return null;
    const level = Number.parseFloat(match[1]);
    if (!Number.isFinite(level)) return null;
    return {
        prefix: morphId.slice(0, match.index),
        level,
    };
};

export function getLeveledMorphLevel(
    id: MorphId,
    template?: LeveledMorphTemplateId,
): number | null {
    if (template) {
        const prefix = leveledMorphPrefix(template);
        if (!id.startsWith(prefix)) return null;
        const level = Number.parseFloat(id.slice(prefix.length));
        return Number.isFinite(level) ? level : null;
    }

    return parseLeveledMorphLevelSuffix(id)?.level ?? null;
}

export function morphLvl(id: MorphId | null | undefined): number {
    if (!id) return 0;
    const level = getLeveledMorphLevel(id);
    return level ?? 0;
}

export function sourceIdSatisfiesRequirement(
    ownedIds: readonly string[],
    requiredId: string,
): boolean {
    if (ownedIds.includes(requiredId)) return true;

    const required = parseLeveledMorphLevelSuffix(requiredId);
    if (!required) return false;

    for (const ownedId of ownedIds) {
        if (!ownedId.startsWith(required.prefix)) continue;
        const ownedLevel = Number.parseFloat(
            ownedId.slice(required.prefix.length),
        );
        if (Number.isFinite(ownedLevel) && ownedLevel >= required.level) {
            return true;
        }
    }

    return false;
}
