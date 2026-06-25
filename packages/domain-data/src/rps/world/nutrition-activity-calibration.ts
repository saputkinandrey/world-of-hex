import type { CreatureNutritionNeedsData } from "../world/entities";
import type { NutritionActivityData } from "../from-gpt/action-nutrition-activity";
import { NUTRITION_ACTIVITY_PRESETS } from "../from-gpt/action-nutrition-activity";

export interface ActivityScheduleEntry {
    hours: number;
    nutritionActivity: NutritionActivityData;
}

export interface DailyNutritionFromScheduleInput {
    basalNutritionPerDay: CreatureNutritionNeedsData;
    schedule: ActivityScheduleEntry[];
}

const HOURS_PER_DAY = 24;

export const computeDailyNutritionFromActivitySchedule = (
    input: DailyNutritionFromScheduleInput,
): CreatureNutritionNeedsData => {
    const scheduledHours = input.schedule.reduce(
        (sum, entry) => sum + entry.hours,
        0,
    );
    const unscheduledHours = Math.max(0, HOURS_PER_DAY - scheduledHours);
    const basalPerHour = {
        energy: input.basalNutritionPerDay.energyPerDay / HOURS_PER_DAY,
        protein: input.basalNutritionPerDay.proteinPerDay / HOURS_PER_DAY,
        water:
            (input.basalNutritionPerDay.waterPerDay ?? 0) / HOURS_PER_DAY,
        mass: input.basalNutritionPerDay.massPerDayLb / HOURS_PER_DAY,
    };

    let energyPerDay = 0;
    let proteinPerDay = 0;
    let waterPerDay = 0;
    let massPerDayLb = input.basalNutritionPerDay.massPerDayLb;

    const accumulateHours = (
        hours: number,
        nutritionActivity: NutritionActivityData,
    ) => {
        energyPerDay += basalPerHour.energy * nutritionActivity.energyMultiplier * hours;
        proteinPerDay +=
            basalPerHour.protein * nutritionActivity.proteinMultiplier * hours;
        waterPerDay +=
            basalPerHour.water * nutritionActivity.waterMultiplier * hours;
    };

    for (const entry of input.schedule) {
        accumulateHours(entry.hours, entry.nutritionActivity);
    }

    if (unscheduledHours > 0) {
        accumulateHours(unscheduledHours, {
            intensity: "rest",
            energyMultiplier: 0.9,
            proteinMultiplier: 1,
            waterMultiplier: 0.95,
        });
    }

    return {
        energyPerDay: Math.round(energyPerDay * 10) / 10,
        proteinPerDay: Math.round(proteinPerDay * 10) / 10,
        waterPerDay: Math.round(waterPerDay * 10) / 10,
        massPerDayLb,
    };
};

export interface ConsumerNutritionTarget {
    id: string;
    name: string;
    targetEnergy: number;
    targetProtein: number;
    targetWater: number;
}

export interface ConsumerCalibrationSchedule {
    consumerId: string;
    schedule: ActivityScheduleEntry[];
}

export const HUMAN_WARM_BLOODED_BASAL_NUTRITION: CreatureNutritionNeedsData = {
    energyPerDay: 30,
    proteinPerDay: 5,
    waterPerDay: 15,
    massPerDayLb: 3,
};

export const CONSUMER_CALIBRATION_SCHEDULES: ConsumerCalibrationSchedule[] = [
    {
        consumerId: "consumer-sedentary-scholar",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 10, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.sedentary },
        ],
    },
    {
        consumerId: "consumer-domestic-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.light },
        ],
    },
    {
        consumerId: "consumer-craft-worker",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 9, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.light },
        ],
    },
    {
        consumerId: "consumer-guild-master",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 9, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.sedentary },
            { hours: 2, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.light },
        ],
    },
    {
        consumerId: "consumer-natural-harvest",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.moderate },
        ],
    },
    {
        consumerId: "consumer-patrol-service-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.moderate },
        ],
    },
    {
        consumerId: "consumer-heavy-craft-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 4, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.moderate },
            { hours: 4, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.vigorous },
        ],
    },
    {
        consumerId: "consumer-hunting-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 6, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.vigorous },
        ],
    },
    {
        consumerId: "consumer-load-carrying-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 7, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.vigorous },
        ],
    },
    {
        consumerId: "consumer-building-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.vigorous },
        ],
    },
    {
        consumerId: "consumer-caravan-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.moderate },
            { hours: 2, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.vigorous },
        ],
    },
    {
        consumerId: "consumer-long-travel-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 9, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.moderate },
        ],
    },
    {
        consumerId: "consumer-warrior-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 6, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.vigorous },
            { hours: 2, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.moderate },
        ],
    },
    {
        consumerId: "consumer-heavy-field-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 6, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.vigorous },
            { hours: 3, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.moderate },
        ],
    },
    {
        consumerId: "consumer-extreme-extraction-work",
        schedule: [
            { hours: 8, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.rest },
            { hours: 7, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.extreme },
            { hours: 1, nutritionActivity: NUTRITION_ACTIVITY_PRESETS.moderate },
        ],
    },
];

export const isWithinCalibrationTolerance = (
    actual: number,
    target: number,
    toleranceRatio: number,
): boolean => {
    const delta = Math.abs(actual - target);
    return delta <= Math.max(target * toleranceRatio, 1);
};
