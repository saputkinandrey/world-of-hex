import type { ActionDefinition } from "./action-definition";

export type NutritionActivityIntensity =
    | "rest"
    | "sedentary"
    | "light"
    | "moderate"
    | "vigorous"
    | "extreme";

export interface NutritionActivityData {
    intensity: NutritionActivityIntensity;
    energyMultiplier: number;
    proteinMultiplier: number;
    waterMultiplier: number;
    basis?: string;
}

export interface NutritionActivityMultipliers {
    energy: number;
    protein: number;
    water: number;
}

export const NUTRITION_ACTIVITY_INTENSITIES: NutritionActivityIntensity[] = [
    "rest",
    "sedentary",
    "light",
    "moderate",
    "vigorous",
    "extreme",
];

export const NUTRITION_ACTIVITY_PRESETS: Record<
    NutritionActivityIntensity,
    NutritionActivityData
> = {
    rest: {
        intensity: "rest",
        energyMultiplier: 0.85,
        proteinMultiplier: 1,
        waterMultiplier: 0.95,
        basis: "sleep and passive recovery",
    },
    sedentary: {
        intensity: "sedentary",
        energyMultiplier: 2.35,
        proteinMultiplier: 2.45,
        waterMultiplier: 2.7,
        basis: "seated cognitive, social or administrative work",
    },
    light: {
        intensity: "light",
        energyMultiplier: 3,
        proteinMultiplier: 2.8,
        waterMultiplier: 3.2,
        basis: "light domestic, craft or self-care labor",
    },
    moderate: {
        intensity: "moderate",
        energyMultiplier: 4.8,
        proteinMultiplier: 3.2,
        waterMultiplier: 6.5,
        basis: "walking, patrol, forage or travel",
    },
    vigorous: {
        intensity: "vigorous",
        energyMultiplier: 6.5,
        proteinMultiplier: 7,
        waterMultiplier: 7,
        basis: "hunting, combat, construction or hauling",
    },
    extreme: {
        intensity: "extreme",
        energyMultiplier: 8.2,
        proteinMultiplier: 8,
        waterMultiplier: 9,
        basis: "mining, forced march or heavy extraction",
    },
};

export interface ClassifyActionNutritionActivityInput {
    tag: string;
    moduleName: string;
    group: string;
    costEnergy?: number;
    costTime?: number;
    need?: string;
}

const REST_TAG_PATTERN =
    /\b(SLEEP|REST|NAP|DOZE|RECOVER|RECOVERY|IDLE|FREEZE_IN_PLACE)\b/i;
const SEDENTARY_TAG_PATTERN =
    /\b(OBSERV|READ|STUDY|WRITE|PLAN|MEET|NEGOTIAT|COUNSEL|TEACH|RECORD|BRIEF|LOG|MINUTE|GLOSSARY|QUESTION|DEBUNK|LANGUAGE|LEDGER|SUMMARY|STATUS|RUNDOWN|MAP|CHART|ROLE|PROTOCOL|COMMON_GLOSSARY|WORKLOG|ENCRYPT|ASSERT|DECLARE|RESERVE|SET_OWN|CHOOSE_WORK|REFUSE|RENOUNCE|INAUGURAT|ENDOW|COMMISSION|FOUND_SCHOLARSHIP|SET_SUCCESSION|CREATE_FOUNDATION|LAW|JUSTICE|FAIRNESS|ACCOUNTABILITY|CLARITY|ORDER|LOYALTY|BELONGING|COMMUNITY|STATUS|HONOR|RESPECT|TRUST|FAITH|HOPE|SPIRIT|MOOD|MORALE|AFFECT|FAMILY|BELONG|NETWORK|PRIVACY|IDENTITY|TRADITION|CULTURE|LEGACY|PURPOSE|INSPIRATION|CREATIVITY|INNOVATION|KNOWLEDGE|FOCUS|DISCIPLINE|CONTROL|EFFICIENCY|PRODUCTIVITY|QUALITY|STABILITY|SECURITY|PROPERTY|WEALTH|POWER|DOMINANCE|COMPETITION|MASTERY|COURAGE|FREEDOM|JOY|COMFORT|CURIOUS)\b/i;
const LIGHT_TAG_PATTERN =
    /\b(EAT|DRINK|COOK|CRAFT|SEW|MEND|CLEAN|WASH|GROOM|BATH|COMB|FEED|PLANT|HARVEST|GATHER|FORAGE_LIGHT|SELF_CARE|HOT_BEVERAGE|DECOR|MEMENTO|ART|RESTORE|GUILD_EXHIBIT|TRADITIONAL_ART|SIGNATURE_WORK|SPICE|HERB|BREW|BAKE|PREP|MEAL|FOOD_PREP)\b/i;
const MODERATE_TAG_PATTERN =
    /\b(FORAGE|WALK|PATROL|TRAVEL|MARCH|ROW|CARAVAN|HUNT_WAIT|ACTIVE_FORAGE|SCOUT|EXPLORE|FISH|TRAP|WORK_FOR|RUN_MARKET|FIELD|FARM|HERD|TEND|PRUNE|DIG_LIGHT|CARRY_LIGHT|BUILD_LIGHT|TRAIN_TOGETHER|TRAIN_ON|EXPERIMENT|NATURAL|HARVEST|GATHER|WATER_FETCH|SEEK|BASK|COOL|THERMOREG)\b/i;
const VIGOROUS_TAG_PATTERN =
    /\b(HUNT|FIGHT|COMBAT|FLEE|FLEE_TO|DASH|ATTACK|CHASE|FLEE|BUILD|CONSTRUCT|TRAIN_WITH|TRAIN_FOR|WEAPON|PATROL_PERIMETER|HUNT_THREAT|CARRY|HAUL|LOAD|PORTER|BUILDER|BUILD_|DIG|MINE|QUARRY|EXTRACT|WARRIOR|GUARD|DEFEND|FORTIF|REPAIR_HEAVY|HEAVY|CRAFT_HEAVY|SMITH|FORGE|LIFT|CLIMB|SWIM|ROW_HARD|ESCAPE)\b/i;
const EXTREME_TAG_PATTERN =
    /\b(FORCED_MARCH|EXTREME|MINING|QUARRY|EXTRACTION|HEAVY_FIELD|HEAVY_EXTRACTION|HEAVY_CRAFT|HEAVY_LABOR|CARRY_HEAVY|BUILD_MONUMENT|BUILD_PUBLIC|PLANT_SACRED)\b/i;

const INTAKE_TAG_PATTERN = /\b(EAT_|DRINK_|DRINK_WATER|DRINK_DIRTY)\b/i;

const classifyByTag = (
    tag: string,
): NutritionActivityIntensity | undefined => {
    if (INTAKE_TAG_PATTERN.test(tag)) {
        return "light";
    }
    if (REST_TAG_PATTERN.test(tag)) {
        return "rest";
    }
    if (EXTREME_TAG_PATTERN.test(tag)) {
        return "extreme";
    }
    if (VIGOROUS_TAG_PATTERN.test(tag)) {
        return "vigorous";
    }
    if (MODERATE_TAG_PATTERN.test(tag)) {
        return "moderate";
    }
    if (LIGHT_TAG_PATTERN.test(tag)) {
        return "light";
    }
    if (SEDENTARY_TAG_PATTERN.test(tag)) {
        return "sedentary";
    }
    return undefined;
};

const classifyByModule = (
    moduleName: string,
    group: string,
): NutritionActivityIntensity | undefined => {
    if (moduleName === "rest" || moduleName === "generic-actions") {
        return "rest";
    }
    if (moduleName === "food" || moduleName === "water") {
        return "light";
    }
    if (moduleName === "food-hunt" || moduleName === "security") {
        return "vigorous";
    }
    if (group === "etho") {
        return "moderate";
    }
    return undefined;
};

const classifyByCostSignals = (
    costEnergy: number | undefined,
    costTime: number | undefined,
): NutritionActivityIntensity => {
    const energy = costEnergy ?? 0;
    const time = costTime ?? 0;
    if (energy <= 0 && time >= 0.5) {
        return "rest";
    }
    if (energy >= 0.35 || time >= 4) {
        return "vigorous";
    }
    if (energy >= 0.18 || time >= 2.5) {
        return "moderate";
    }
    if (energy >= 0.08 || time >= 1.2) {
        return "light";
    }
    if (energy >= 0.03) {
        return "sedentary";
    }
    return "sedentary";
};

export const classifyActionNutritionActivity = (
    input: ClassifyActionNutritionActivityInput,
): NutritionActivityData => {
    const fromTag = classifyByTag(input.tag);
    const fromModule = classifyByModule(input.moduleName, input.group);
    const fromCost = classifyByCostSignals(input.costEnergy, input.costTime);

    const intensity = fromTag ?? fromModule ?? fromCost;
    const preset = NUTRITION_ACTIVITY_PRESETS[intensity];
    const basisParts = [preset.basis];
    if (fromTag && fromTag !== intensity) {
        basisParts.push(`tag:${input.tag}`);
    }
    if (!fromTag && fromModule) {
        basisParts.push(`module:${input.moduleName}`);
    }
    if (!fromTag && !fromModule) {
        basisParts.push("cost-signals");
    }

    return {
        ...preset,
        basis: basisParts.join("; "),
    };
};

export const getNutritionActivityMultipliers = (
    nutritionActivity: NutritionActivityData | undefined,
): NutritionActivityMultipliers | undefined => {
    if (!nutritionActivity) {
        return undefined;
    }
    return {
        energy: nutritionActivity.energyMultiplier,
        protein: nutritionActivity.proteinMultiplier,
        water: nutritionActivity.waterMultiplier,
    };
};

export const buildNutritionActivityFromAction = (
    action: Pick<
        ActionDefinition,
        "tag" | "costEnergy" | "costTime" | "need" | "nutritionActivity"
    >,
    context: Omit<ClassifyActionNutritionActivityInput, "tag" | "costEnergy" | "costTime" | "need">,
): NutritionActivityData => {
    if (action.nutritionActivity) {
        return action.nutritionActivity;
    }
    return classifyActionNutritionActivity({
        tag: action.tag ?? "",
        moduleName: context.moduleName,
        group: context.group,
        costEnergy: action.costEnergy,
        costTime: action.costTime,
        need: action.need,
    });
};
