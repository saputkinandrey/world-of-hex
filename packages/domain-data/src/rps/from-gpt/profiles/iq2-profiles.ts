import iq2ProfileLensDataJson from "../data/profiles/iq2-profile-lenses.json";
import type { Iq2ProfileLensData, ProfileLensData } from "../entities";
import type { MemeId } from "../../world/memes";
import type { MorphId } from "../../world/morphs";

export const iq2ProfileLensData = iq2ProfileLensDataJson as Iq2ProfileLensData;

function requiredLens(lensKey: string): ProfileLensData {
    const lens = iq2ProfileLensData.lenses[lensKey];
    if (!lens) {
        throw new Error(`Missing IQ2 profile lens ${lensKey}`);
    }

    return lens;
}

function lensMemes(lensKey: string): MemeId[] {
    return (requiredLens(lensKey).memeIds ?? []) as MemeId[];
}

export const IQ2_BASE_MEMES: (MemeId | MorphId)[] = [
    ...((iq2ProfileLensData.base.morphIds ?? []) as MorphId[]),
    ...((iq2ProfileLensData.base.memeIds ?? []) as MemeId[]),
];

export const IQ2_TERRITORIAL_LENS = lensMemes("territorial");

export const IQ2_SOLITARY_LENS = lensMemes("solitary");

export const IQ2_CHEMOSENSE_LENS = lensMemes("chemosense");

export const IQ2_VIBROSENSE_LENS = lensMemes("vibrosense");

export const IQ2_HEAT_LOCALIZATION_LENS = lensMemes("heatLocalization");

export const IQ2_LIMB_UNARMED_COMBAT_LENS = lensMemes("limbUnarmedCombat");

export const IQ2_THROWING_LENS = lensMemes("throwing");

export const IQ2_CONSTRICTOR_STYLE_LENS = lensMemes("constrictorStyle");
