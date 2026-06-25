// helpers/actor-factory.helper.ts

import type { HexId } from '../world/hex.entity';
import {
    ActorEntity,
    CreaturePhysicalProfile,
    MetabolismProfile,
    type NutritionContent,
    type NutritionNeeds,
} from '../world/actor/actor.entity';
import type { CreatureTemplateEntity } from '../domain/character/creature-template.entity';
import type { CharacterEntity } from '../domain/character/character.entity';
import {
    estimateDailyFoodMassNeedLbFromStrengthAndBuild,
    estimateHexVolumeFromMorphIdsAndTraits,
    getStrengthFromMorphIds,
} from '@wohex/domain-data/rps';

/**
 * Хелпер, который знает, как из доменных сущностей собрать ActorEntity
 * для симуляции (from-gpt/world).
 *
 * НЕ доменная сущность, поэтому живёт в helpers.
 */
export class ActorFactoryHelper {
    /**
     * Создаёт актора для "звериного" CreatureTemplate.
     * Здесь пока жёстко забиты параметры физики/метаболизма;
     * потом можно будет заменить на расчёт из ST/HT/SM.
     */
    createFromTemplate(params: {
        template: CreatureTemplateEntity;
        hexId: HexId;
        id: string;
        name?: string;
    }): ActorEntity {
        const { template, hexId, id, name = template.name } = params;

        const volumeEstimate = estimateHexVolumeFromMorphIdsAndTraits(template.morphIds);
        if (!volumeEstimate) {
            throw new Error(`Cannot estimate hex volume for template ${template.name} without explicit ST morph.`);
        }
        const physical = new CreaturePhysicalProfile({
            baseVolume: volumeEstimate.baseVolume,
            minVolume: volumeEstimate.minVolume,
            carryVolumeCapacity: volumeEstimate.carryVolumeCapacity,
        });

        const strength = getStrengthFromMorphIds(template.morphIds) ?? template.primary?.st?.totalLevel;
        if (strength === undefined || !Number.isFinite(strength)) {
            throw new Error(`Cannot estimate daily food mass for template ${template.name} without explicit ST.`);
        }

        const nutritionNeeds: NutritionNeeds = {
            energyPerDay: 10,
            proteinPerDay: 1,
            waterPerDay: 0.5,
            massPerDayLb: estimateDailyFoodMassNeedLbFromStrengthAndBuild(strength),
        };

        const consumptionPerTurn: NutritionContent = {
            energy: nutritionNeeds.energyPerDay / 24,
            protein: nutritionNeeds.proteinPerDay / 24,
            water: (nutritionNeeds.waterPerDay ?? 0) / 24,
            massLb: nutritionNeeds.massPerDayLb / 24,
        };

        const metabolism = new MetabolismProfile({
            nutritionNeedsPerDay: nutritionNeeds,
            consumptionPerTurn,
        });

        return new ActorEntity({
            id,
            name,
            hexId,
            physical,
            metabolism,
            posture: 'standing',
            inventoryItemIds: [],
            creatureProfile: template,
        });
    }

    /**
     * Создаёт актора на основе полноценного CharacterEntity (PC или NPC).
     * Пока заглушка — сюда потом можно подвязать поиск CreatureTemplate по расе/типу.
     */
    createFromCharacter(params: { character: CharacterEntity; hexId: HexId }): ActorEntity {
        const { character, hexId } = params;

        // TODO: достать creatureTemplate по raceId/видовой информации из CharacterEntity
        // и переиспользовать createFromTemplate(...)

        throw new Error('ActorFactoryHelper.createFromCharacter not implemented yet');
    }
}
