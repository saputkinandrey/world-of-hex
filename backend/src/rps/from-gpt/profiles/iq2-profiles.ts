// iq2-profiles.ts
import { MemeId, IQ2, bio, core, eth, tech } from '../memes';
import {MorphId} from "../morphs";

export const IQ2_BASE_MEMES: MemeId|MorphId[] = [
    IQ2,
    bio.vital.core,
    core.perception,
    core.motor_coordination,

    // базовый уход за телом и температурой — теперь это часть базы
    eth.maintenance.cleanliness_core,
    eth.maintenance.thermoregulation,

    // умение вообще использовать тело в бою,
    // без детализации конечностей/укусов и т.п.
    tech.combat.core,
];

// ───────────────────────────────────────────────────────────────
// ЛИНЗЫ ЧУТЬ-ЧУТЬ ПРО БЫТ / ЭТОЛОГИЮ (но уже НЕ база!)
// ───────────────────────────────────────────────────────────────


export const IQ2_TERRITORIAL_LENS: MemeId[] = [
    eth.territory_marking,
];

export const IQ2_SOLITARY_LENS: MemeId[] = [
    eth.sociality.solitary,
];

// ───────────────────────────────────────────────────────────────
// СЕНСОРНЫЕ ЛИНЗЫ (морфология органов чувств)
// ───────────────────────────────────────────────────────────────

export const IQ2_CHEMOSENSE_LENS: MemeId[] = [
    tech.sensing.chemosense_basic,
];

export const IQ2_VIBROSENSE_LENS: MemeId[] = [
    tech.sensing.vibration_basic,
];

export const IQ2_HEAT_LOCALIZATION_LENS: MemeId[] = [
    tech.sensing.heat_localization_basic,
];

// ───────────────────────────────────────────────────────────────
// ЛИНЗЫ "ТИП ТЕЛА" ДЛЯ БОЯ / ДВИЖЕНИЙ
// ───────────────────────────────────────────────────────────────

// Ударное тело / конечности: "классическая" рукопашка.
// (это профиль, подходящий собаке/кошке/обезьяне, но уже не змее)
export const IQ2_LIMB_UNARMED_COMBAT_LENS: MemeId[] = [
    tech.combat.unarmed_basic,
];

// Возможность бросать отдельные объекты (камни, палки и т.п.).
// Змее просто НЕ ДАЁМ эту линзу.
export const IQ2_THROWING_LENS: MemeId[] = [
    tech.throwing.basic,
    tech.combat.missile_basic,
];

// "Змеиный" стиль: кусь + констрикция (если захочешь задействовать).
// Внимание: в memeDeps сейчас ключ для constriction записан как
// [eth.tactics.constriction] без "memes.", это баг, но сам MemeId валиден.
export const IQ2_CONSTRICTOR_STYLE_LENS: MemeId[] = [
    tech.combat.bite_basic,
    // tech.combat.venom_delivery — если вид ядовитый
    eth.tactics.ambush_stalk,
    // eth.tactics.constriction, // можно добавить, когда поправишь key в memeDeps
];
