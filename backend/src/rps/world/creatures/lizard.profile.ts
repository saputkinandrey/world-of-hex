import type { CreatureActionRefData, CreatureProfileData } from '@wohex/domain-data/rps/world/creature-profiles';

import type { HexId } from '../hex.entity';
import {
    ActorEntity,
    CreaturePhysicalProfile,
    MetabolismProfile,
    type NutritionContent,
    type NutritionNeeds,
} from '../actor/actor.entity';
import type { MemeId } from '../memes';
import type { MorphId } from '../morphs';
import { LIZARD_PROFILE_DATA } from '../creature-profiles';
import type { ActionDefinition } from '../../from-gpt/action-definition';
import { HUNT_ACTIVE_FORAGE, HUNT_WAIT_IN_AMBUSH } from '../../from-gpt/actions-by-need/food-hunt';
import { EAT_ACCEPTABLE, EAT_POOR } from '../../from-gpt/actions-by-need/food';
import { DRINK_DIRTY_WATER } from '../../from-gpt/actions-by-need/water';
import { SLEEP_REST } from '../../from-gpt/etho/generic-actions';
import {
    BASK_SUN_THERMOREGULATE,
    BURROW_HIDE_OR_AMBUSH,
    DEFENSIVE_WARNING_DISPLAY,
    TERRITORY_MICROHABIT_EXPLORE,
} from '../../from-gpt/etho/action-universal';
import {
    FLEE_TO_COVER,
    FREEZE_IN_PLACE,
    OBSERVATION,
    SHORT_DASH_ATTACK,
} from '../../from-gpt/etho/action-small-vertebrate';
import { CreatureTemplateEntity } from '../../domain/character/creature-template.entity';

interface CreatureProfileRuntime {
    id: string;
    name: string;
    memes: MemeId[];
    morphs: MorphId[];
    actions: ActionDefinition[];
    createActor(hexId: HexId, id: string, name?: string): ActorEntity;
}

type ActionRegistry = Record<string, ActionDefinition>;

function actionRefKey(ref: CreatureActionRefData): string {
    return `${ref.group}/${ref.moduleName}/${ref.exportName}`;
}

const LIZARD_ACTION_REGISTRY: ActionRegistry = {
    'actions-by-need/food-hunt/HUNT_WAIT_IN_AMBUSH': HUNT_WAIT_IN_AMBUSH,
    'actions-by-need/food-hunt/HUNT_ACTIVE_FORAGE': HUNT_ACTIVE_FORAGE,
    'actions-by-need/food/EAT_ACCEPTABLE': EAT_ACCEPTABLE,
    'actions-by-need/food/EAT_POOR': EAT_POOR,
    'actions-by-need/water/DRINK_DIRTY_WATER': DRINK_DIRTY_WATER,
    'etho/generic-actions/SLEEP_REST': SLEEP_REST,
    'etho/action-universal/BASK_SUN_THERMOREGULATE': BASK_SUN_THERMOREGULATE,
    'etho/action-universal/TERRITORY_MICROHABIT_EXPLORE': TERRITORY_MICROHABIT_EXPLORE,
    'etho/action-universal/DEFENSIVE_WARNING_DISPLAY': DEFENSIVE_WARNING_DISPLAY,
    'etho/action-universal/BURROW_HIDE_OR_AMBUSH': BURROW_HIDE_OR_AMBUSH,
    'etho/action-small-vertebrate/FLEE_TO_COVER': FLEE_TO_COVER,
    'etho/action-small-vertebrate/FREEZE_IN_PLACE': FREEZE_IN_PLACE,
    'etho/action-small-vertebrate/SHORT_DASH_ATTACK': SHORT_DASH_ATTACK,
    'etho/action-small-vertebrate/OBSERVATION': OBSERVATION,
};

function resolveCreatureActions(profile: CreatureProfileData, registry: ActionRegistry): ActionDefinition[] {
    return profile.actions.map((ref) => {
        const key = actionRefKey(ref);
        const action = registry[key];
        if (!action) {
            throw new Error(`Creature profile ${profile.id} references unknown action ${key}`);
        }

        return action;
    });
}

function createPhysicalProfile(profile: CreatureProfileData): CreaturePhysicalProfile {
    return new CreaturePhysicalProfile(profile.physical);
}

function createMetabolismProfile(profile: CreatureProfileData): MetabolismProfile {
    return new MetabolismProfile({
        nutritionNeedsPerDay: profile.nutritionNeedsPerDay,
        consumptionPerTurn: profile.consumptionPerTurn,
    });
}

function createCreatureTemplate(profile: CreatureProfileData): CreatureTemplateEntity {
    return new CreatureTemplateEntity({
        name: profile.name,
        alias: profile.defaultActorName,
        memeIds: profile.memes as MemeId[],
        morphIds: profile.morphs as MorphId[],
    });
}

function createCreatureProfileRuntime(profile: CreatureProfileData): CreatureProfileRuntime {
    const physicalProfile = createPhysicalProfile(profile);
    const metabolismProfile = createMetabolismProfile(profile);
    const creatureTemplate = createCreatureTemplate(profile);

    return {
        id: profile.id,
        name: profile.name,
        memes: profile.memes as MemeId[],
        morphs: profile.morphs as MorphId[],
        actions: resolveCreatureActions(profile, LIZARD_ACTION_REGISTRY),
        createActor(hexId: HexId, id: string, name: string = profile.defaultActorName): ActorEntity {
            return new ActorEntity({
                id,
                name,
                hexId,
                physical: physicalProfile,
                metabolism: metabolismProfile,
                posture: 'standing',
                inventoryItemIds: [],
                creatureProfile: creatureTemplate,
            });
        },
    };
}

export const LIZARD_MEMES = LIZARD_PROFILE_DATA.memes as MemeId[];

export const LIZARD_MORPHS = LIZARD_PROFILE_DATA.morphs as MorphId[];

export const LIZARD_ACTIONS = resolveCreatureActions(LIZARD_PROFILE_DATA, LIZARD_ACTION_REGISTRY);

export const LIZARD_NUTRITION_NEEDS = LIZARD_PROFILE_DATA.nutritionNeedsPerDay as NutritionNeeds;

export const LIZARD_CONSUMPTION_PER_TURN = LIZARD_PROFILE_DATA.consumptionPerTurn as NutritionContent;

export const LIZARD_PHYSICAL_PROFILE = createPhysicalProfile(LIZARD_PROFILE_DATA);

export const LIZARD_METABOLISM_PROFILE = createMetabolismProfile(LIZARD_PROFILE_DATA);

export type CreatureProfile = CreatureProfileRuntime;

export const LIZARD_PROFILE = createCreatureProfileRuntime(LIZARD_PROFILE_DATA);
