// world/creatures/lizard.profile.ts
// Профиль ящерицы: мемы, морфология, действия и фабрика актора.

import type { HexId } from '../hex.entity';
import { bio, core, eth, IQ2, type MemeId, tech } from '../../memes';
import type { ActionDefinition } from '../../action-definition';

import { EAT_ACCEPTABLE, EAT_POOR } from '../../actions-by-need/food';
import { DRINK_DIRTY_WATER } from '../../actions-by-need/water';
import { SLEEP_REST } from '../../etho/generic-actions';

import {
    BASK_SUN_THERMOREGULATE,
    BURROW_HIDE_OR_AMBUSH,
    DEFENSIVE_WARNING_DISPLAY,
    TERRITORY_MICROHABIT_EXPLORE,
} from '../../etho/action-universal';

import {
    FLEE_TO_COVER,
    FREEZE_IN_PLACE,
    OBSERVATION,
    SHORT_DASH_ATTACK,
} from '../../etho/action-small-vertebrate';

import {
    HUNT_ACTIVE_FORAGE,
    HUNT_WAIT_IN_AMBUSH,
} from '../../actions-by-need/food-hunt';

import {
    ActorEntity,
    CreaturePhysicalProfile,
    MetabolismProfile,
    type NutritionContent,
    type NutritionNeeds,
} from '../actor.entity';

import { morph, type MorphId } from '../../morphs';

// ───────────────────────────────────────────────────────────────
// Мемный профиль ящерицы (IQ2, холоднокровная, визуальный хищник)
// ───────────────────────────────────────────────────────────────

export const LIZARD_MEMES: MemeId[] = [
    // базовый интеллект и "живость"
    IQ2,

    // сенсорика (поведенческий/«софт»-уровень)
    tech.sensing.vision_basic,
    tech.sensing.chemosense_basic,
    tech.sensing.vibration_basic,

    // уход за телом и кожа
    eth.maintenance.cleanliness_core,
    eth.maintenance.thermoregulation,
    eth.maintenance.ecdysis,

    // простая этология
    eth.territory_marking,
    eth.sociality.solitary,

    // хищничество (мелкая движущаяся добыча)
    eth.predation.core,
    eth.predation.drive.prey_drive,
    eth.predation.drive.opportunistic,

    // тактика: засада + короткий рывок
    eth.tactics.ambush_stalk,

    // базовый бой / "техника тела"
    tech.combat.core,
    tech.combat.bite_basic,

    // базовая охота без "tracking по следу"
    tech.hunting.core,
];

// ───────────────────────────────────────────────────────────────
// Морфологический профиль ящерицы (что умеет её тело)
// ───────────────────────────────────────────────────────────────

export const LIZARD_MORPHS: MorphId[] = [
    bio.vital.core,
    bio.vital.cold_blooded,

    // ядро тела и восприятия
    core.perception,
    core.motor_coordination,

    // План тела и общий класс
    morph.body_plan.tetrapod_small_ground,
    morph.size.SMn6,          // вместо прошлых tiny/SM-6
    morph.thermoreg.coldBlooded,
    morph.respiration.lungs_basic,

    // Покровы
    morph.integument.scales_dry,

    // Локомоция
    morph.locomotion.crawl_quadruped,
    morph.locomotion.climb_rough_surface,

    // Манипуляторы (по сути рот + грубые лапы)
    morph.manip.mouth_only,
    morph.manip.forepaws_non_manip,

    // Природное оружие
    morph.natural_weapon.bite_small,
    morph.natural_weapon.claws_small,

    // Сенсорное железо
    morph.sense.vision_basic,
    morph.sense.vision_binocular,
    // для дневной ящерицы можно считать, что цветное зрение развито:
    morph.sense.vision_color_rich,
    morph.sense.olfaction_basic,
    morph.sense.hearing_basic,
    morph.sense.vibration_ground,
];

// ───────────────────────────────────────────────────────────────
// Набор действий ящерицы (только поведенческие экшены)
// ───────────────────────────────────────────────────────────────

export const LIZARD_ACTIONS: ActionDefinition[] = [
    // 1) Питание и базовые потребности
    HUNT_WAIT_IN_AMBUSH,
    HUNT_ACTIVE_FORAGE,
    EAT_ACCEPTABLE,
    EAT_POOR,
    DRINK_DIRTY_WATER,
    SLEEP_REST,

    // 2) Универсальное поведение/психология
    BASK_SUN_THERMOREGULATE,
    TERRITORY_MICROHABIT_EXPLORE,
    DEFENSIVE_WARNING_DISPLAY,
    // SHED_SKIN_ECDYSIS — можно добавить сюда, когда решим, что линька входит в "активный" профиль
    BURROW_HIDE_OR_AMBUSH,

    // 3) Универсальные паттерны "малого наземного позвоночного"
    FLEE_TO_COVER,
    FREEZE_IN_PLACE,
    SHORT_DASH_ATTACK,
    OBSERVATION,
];

// ───────────────────────────────────────────────────────────────
// Физика и метаболизм ящерицы
// ───────────────────────────────────────────────────────────────

export const LIZARD_NUTRITION_NEEDS: NutritionNeeds = {
    energyPerDay: 10,
    proteinPerDay: 1,
    waterPerDay: 0.5,
    massPerDayLb: 0.5,
};

export const LIZARD_CONSUMPTION_PER_TURN: NutritionContent = {
    energy: 10 / 24,
    protein: 1 / 24,
    water: 0.5 / 24,
    massLb: 0.5 / 24,
};

export const LIZARD_PHYSICAL_PROFILE = new CreaturePhysicalProfile({
    baseVolume: 0.5,
    minVolume: 0.25,
    carryVolumeCapacity: 0.5,
});

export const LIZARD_METABOLISM_PROFILE = new MetabolismProfile({
    nutritionNeedsPerDay: LIZARD_NUTRITION_NEEDS,
    consumptionPerTurn: LIZARD_CONSUMPTION_PER_TURN,
});

// ───────────────────────────────────────────────────────────────
// Профиль существа и фабрика актора
// ───────────────────────────────────────────────────────────────

export interface CreatureProfile {
    id: string;
    name: string;
    memes: MemeId[];
    morphs: MorphId[];
    actions: ActionDefinition[];
    createActor(hexId: HexId, id: string, name?: string): ActorEntity;
}

export const LIZARD_PROFILE: CreatureProfile = {
    id: 'lizard.generic',
    name: 'Small Lizard',
    memes: LIZARD_MEMES,
    morphs: LIZARD_MORPHS,
    actions: LIZARD_ACTIONS,

    createActor(hexId: HexId, id: string, name: string = 'Lizard'): ActorEntity {
        return new ActorEntity({
            id,
            name,
            hexId,
            physical: LIZARD_PHYSICAL_PROFILE,
            metabolism: LIZARD_METABOLISM_PROFILE,
            posture: 'standing',
            inventoryItemIds: [],
        });
    },
};
