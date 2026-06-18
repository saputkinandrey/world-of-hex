import {
  calculateRationNutrition,
  defaultRationSolverOptions,
  solveRationQuantities,
  type RationCalculatorItem,
} from './ration-calculator';
import defaultConfigJson from '../config/default-economy-admin-config.json';
import type {
  ConfigConsumerNeedProfile,
  ConsumerNeedProfile,
  Good,
  GoodLevel,
  GoodProfile,
  LegacyGood,
  ProductionStep,
  RationItem,
  RationResult,
  RationTemplate,
  EconomyAdminConfig,
} from '../entities';

export interface ConfigFileApiResponse {
  config?: EconomyAdminConfig;
  filePath?: string;
  error?: string;
}

const storageKey = 'wohex.economy-admin.config.v1';
const filePathStorageKey = 'wohex.economy-admin.config-file-path.v1';
const configFileApiPath = '/api/config';
const defaultConfigFilePath = 'economy-admin/config/default-economy-admin-config.json';
const configSyncDebounceMs = 250;
const percentFactor = 100;
const spiceGoodType = 'Специи';
const removedGenericGoodFallbacks = new Map<string, string>([
  ['food-river-fish', 'research-salmon'],
  ['research-cold-water-fish', 'research-salmon'],
  ['research-white-fish', 'research-salmon'],
  ['research-small-game', 'research-grouse'],
  ['research-poultry', 'research-grouse'],
  ['research-waterfowl', 'research-grouse'],
  ['research-bird-eggs', 'research-eggs'],
  ['research-leafy-greens', 'research-wild-herbs'],
  ['research-berries', 'research-lingonberries'],
  ['research-greens', 'research-wild-herbs'],
  ['research-spices', 'food-salt'],
  ['research-flatbread', 'food-wheat'],
]);

const cloneConfig = (config: EconomyAdminConfig): EconomyAdminConfig => {
  return JSON.parse(JSON.stringify(config)) as EconomyAdminConfig;
};

const defaultConfig = cloneConfig(defaultConfigJson as EconomyAdminConfig);

const formatNumber = (value: number, digits = 2): string => {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(
    Number.isFinite(value) ? value : 0,
  );
};

const formatGoodLevel = (goodLevel: GoodLevel): string => {
  return `${formatNumber(goodLevel.level, 0)} - ${goodLevel.name}`;
};

const updateArrayItem = <T,>(items: T[], index: number, patch: Partial<T>): T[] => {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
};

const removeArrayItem = <T,>(items: T[], index: number): T[] => {
  return items.filter((_, itemIndex) => itemIndex !== index);
};

const createUniqueName = (baseName: string, existingNames: string[]): string => {
  const usedNames = new Set(existingNames);
  let nextIndex = existingNames.length + 1;
  let candidate = `${baseName} ${nextIndex}`;
  while (usedNames.has(candidate)) {
    nextIndex += 1;
    candidate = `${baseName} ${nextIndex}`;
  }
  return candidate;
};

const slugify = (value: string): string => {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9а-яё]+/giu, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
};

const normalizeConfig = (config: EconomyAdminConfig): EconomyAdminConfig => {
  const legacyConfig = config as EconomyAdminConfig & {
    rationTarget?: ConsumerNeedProfile;
    rationItems?: Array<RationItem & { goodType?: string; foodType?: string; foodItemId?: string }>;
    foodItems?: Good[];
    foodTypes?: string[];
    foodProfiles?: Array<GoodProfile & { foodType?: string }>;
    familyRules?: unknown;
    familySeed?: unknown;
    familyScale?: unknown;
    areaTypes?: unknown;
    areaComposition?: unknown;
    professions?: unknown;
    gatheringRules?: unknown;
    demographicParams?: unknown;
    initialCohorts?: unknown;
    simulationYears?: unknown;
    birthProbability?: unknown;
    specificationPhases?: unknown;
    specificationIssues?: unknown;
  };
  const normalized = cloneConfig(config) as EconomyAdminConfig & {
    familyRules?: unknown;
    familySeed?: unknown;
    familyScale?: unknown;
    areaTypes?: unknown;
    areaComposition?: unknown;
    professions?: unknown;
    gatheringRules?: unknown;
    demographicParams?: unknown;
    initialCohorts?: unknown;
    simulationYears?: unknown;
    birthProbability?: unknown;
    specificationPhases?: unknown;
    specificationIssues?: unknown;
  };
  delete normalized.familyRules;
  delete normalized.familySeed;
  delete normalized.familyScale;
  delete normalized.areaTypes;
  delete normalized.areaComposition;
  delete normalized.professions;
  delete normalized.gatheringRules;
  delete normalized.demographicParams;
  delete normalized.initialCohorts;
  delete normalized.simulationYears;
  delete normalized.birthProbability;
  delete normalized.specificationPhases;
  delete normalized.specificationIssues;
  normalized.goodTypes = normalized.goodTypes ?? legacyConfig.foodTypes ?? [];
  normalized.goodProfiles =
    normalized.goodProfiles ??
    legacyConfig.foodProfiles?.map((profile) => ({
      ...profile,
      goodType: profile.goodType ?? profile.foodType ?? '',
      edible: typeof profile.edible === 'boolean' ? profile.edible : true,
      valuableProteins: typeof profile.valuableProteins === 'boolean' ? profile.valuableProteins : false,
    })) ??
    [];
  normalized.goodProfiles = normalized.goodProfiles.map((profile) => ({
    ...profile,
    edible: typeof profile.edible === 'boolean' ? profile.edible : true,
    waterRating: Number.isFinite(profile.waterRating) ? Math.max(0, profile.waterRating) : 0,
    valuableProteins: typeof profile.valuableProteins === 'boolean' ? profile.valuableProteins : false,
  }));
  normalized.goodLevels = normalized.goodLevels ?? [];
  normalized.biomes = normalized.biomes ?? [];
  normalized.goods = normalized.goods ?? legacyConfig.foodItems ?? [];
  normalized.consumers = normalized.consumers ?? [];
  normalized.skills = normalized.skills ?? [];
  normalized.rationTemplates = normalized.rationTemplates ?? [];
  normalized.productionChains = normalized.productionChains ?? [];
  normalized.goods = normalized.goods.filter((good) => !removedGenericGoodFallbacks.has(good.id));
  const biomeIds = new Set(normalized.biomes.map((biome) => biome.id));
  normalized.goods = normalized.goods.map((good) => {
    const legacyGood = good as LegacyGood;
    const hasExplicitBiomeIds = Array.isArray(legacyGood.biomeIds);
    const goodWithoutLegacyBiomeId = { ...legacyGood };
    delete goodWithoutLegacyBiomeId.biomeId;
    delete goodWithoutLegacyBiomeId.foodType;
    delete goodWithoutLegacyBiomeId.edible;
    const rawBiomeIds: string[] = hasExplicitBiomeIds
      ? legacyGood.biomeIds ?? []
      : legacyGood.biomeId
        ? [legacyGood.biomeId]
        : [];
    const level = Number.isFinite(good.level) ? Math.max(0, good.level) : 0;
    const validBiomeIds = level === 0 ? Array.from(new Set(rawBiomeIds.filter((biomeId) => biomeIds.has(biomeId)))) : [];
    return {
      ...goodWithoutLegacyBiomeId,
      name: good.name,
      goodType: normalized.goodTypes.includes(good.goodType ?? legacyGood.foodType)
        ? good.goodType ?? legacyGood.foodType ?? ''
        : normalized.goodTypes[0] ?? '',
      level,
      price: Number.isFinite(good.price) ? Math.max(0, good.price) : 1,
      biomeIds: validBiomeIds,
    };
  });
  const getGoodIdForType = (goodType: string): string => {
    const existingGood = normalized.goods.find((good) => good.goodType === goodType);
    if (existingGood) return existingGood.id;
    const id = `good-${slugify(goodType)}-${normalized.goods.length + 1}`;
    normalized.goods = [...normalized.goods, { id, name: goodType, goodType, level: 0, price: 1, biomeIds: [] }];
    return id;
  };
  normalized.consumers = normalized.consumers.map((consumer) => {
    const legacyConsumer = consumer as ConfigConsumerNeedProfile & { targetIngredientCount?: unknown };
    delete legacyConsumer.targetIngredientCount;
    return {
      ...legacyConsumer,
      targetWater: Number.isFinite(consumer.targetWater) ? Math.max(0, consumer.targetWater) : 0,
      targetTaste: Number.isFinite(consumer.targetTaste) ? Math.max(0, consumer.targetTaste) : 3,
      ageBands: consumer.ageBands ?? [],
    };
  });
  normalized.skills = normalized.skills.map((skill) => ({
    ...skill,
    category: skill.category || 'General',
    attribute: skill.attribute || 'Unspecified',
    difficulty: skill.difficulty || 'Unspecified',
    gurpsCode: skill.gurpsCode || '',
    description: skill.description || '',
    sourceSystem: skill.sourceSystem || 'Custom',
    defaults: (skill.defaults ?? []).map((skillDefault) => ({
      ...skillDefault,
      source: skillDefault.source || 'Unspecified',
      modifier: Number.isFinite(skillDefault.modifier) ? skillDefault.modifier : 0,
    })),
  }));
  if (!normalized.selectedSkillId || !normalized.skills.some((skill) => skill.id === normalized.selectedSkillId)) {
    normalized.selectedSkillId = normalized.skills[0]?.id ?? '';
  }
  if ((!config.rationTemplates?.length || config.rationTemplates === undefined) && legacyConfig.rationItems?.length) {
    normalized.selectedRationTemplateId = 'legacy-ration';
    normalized.rationTemplates = [
      {
        id: 'legacy-ration',
        name: 'Legacy ration',
        consumerId: normalized.consumers[0]?.id ?? 'human',
        items: legacyConfig.rationItems,
      },
    ];
  }
  if (!normalized.selectedRationTemplateId || !normalized.rationTemplates.some((template) => template.id === normalized.selectedRationTemplateId)) {
    normalized.selectedRationTemplateId = normalized.rationTemplates[0]?.id ?? '';
  }
  const fallbackConsumerId = normalized.consumers[0]?.id ?? '';
  normalized.rationTemplates = normalized.rationTemplates.map((template) =>
    normalized.consumers.some((consumer) => consumer.id === template.consumerId) ? template : { ...template, consumerId: fallbackConsumerId },
  );
  normalized.rationTemplates = normalized.rationTemplates.map((template) => ({
    ...template,
    items: template.items
      .map((item) => {
        const legacyItem = item as RationItem & { goodType?: string; foodItemId?: string };
        const goodId = item.goodId || legacyItem.foodItemId || getGoodIdForType(legacyItem.goodType ?? normalized.goods[0]?.goodType ?? '');
        return {
          id: item.id,
          goodId: removedGenericGoodFallbacks.get(goodId) ?? goodId,
          quantity: Math.max(0, item.quantity),
        };
      })
      .filter((item) => normalized.goods.some((good) => good.id === item.goodId)),
  }));
  if (
    !normalized.selectedProductionChainId ||
    !normalized.productionChains.some((chain) => chain.id === normalized.selectedProductionChainId)
  ) {
    normalized.selectedProductionChainId = normalized.productionChains[0]?.id ?? '';
  }
  const goodIds = new Set(normalized.goods.map((good) => good.id));
  normalized.productionChains = normalized.productionChains.map((chain) => ({
    ...chain,
    steps: (chain.steps ?? [])
      .map((step) => {
        const legacyStep = step as ProductionStep & {
          inputGoodId?: string;
          inputQuantity?: number;
          outputGoodId?: string;
          outputQuantity?: number;
        };
        const inputs =
          step.inputs ??
          (legacyStep.inputGoodId
            ? [
                {
                  id: `${step.id}-input-1`,
                  goodId: legacyStep.inputGoodId,
                  quantity: legacyStep.inputQuantity ?? 1,
                },
              ]
            : []);
        const outputs =
          step.outputs ??
          (legacyStep.outputGoodId
            ? [
                {
                  id: `${step.id}-output-1`,
                  goodId: legacyStep.outputGoodId,
                  quantity: legacyStep.outputQuantity ?? 1,
                },
              ]
            : []);
        return {
          id: step.id,
          inputs: inputs
            .filter((input) => goodIds.has(input.goodId))
            .map((input) => ({
              ...input,
              quantity: Math.round(Math.max(0, input.quantity)),
            })),
          outputs: outputs
            .filter((output) => goodIds.has(output.goodId))
            .map((output) => ({
              ...output,
              quantity: Math.round(Math.max(0, output.quantity)),
            })),
          preservesInputs:
            typeof step.preservesInputs === 'boolean'
              ? step.preservesInputs
              : outputs.some((output) => inputs.some((input) => input.goodId === output.goodId)),
          durationMinutes: Number.isFinite(step.durationMinutes) ? Math.max(0, step.durationMinutes) : 0,
          note: step.note ?? '',
        };
      })
      .filter((step) => step.inputs.length > 0 && step.outputs.length > 0),
  }));
  return normalized;
};

const getGood = (config: EconomyAdminConfig, goodId: string): Good => {
  return (
    config.goods.find((good) => good.id === goodId) ??
    config.goods[0] ?? {
      id: 'missing-good',
      name: 'Missing good',
      goodType: config.goodTypes[0] ?? '',
      level: 0,
      price: 1,
      biomeIds: [],
    }
  );
};

const getGoodProfile = (config: EconomyAdminConfig, goodType: string): GoodProfile => {
  return (
    config.goodProfiles.find((profile) => profile.goodType === goodType) ??
    config.goodProfiles[0] ?? {
      goodType,
      edible: false,
      weightPerUnitLbs: 0,
      proteinRating: 0,
      energyRating: 0,
      waterRating: 0,
      valuableProteins: false,
    }
  );
};

const getGoodLevelName = (config: EconomyAdminConfig, level: number): string => {
  return config.goodLevels.find((goodLevel) => goodLevel.level === level)?.name ?? 'Missing level';
};

const getEdibleGoods = (config: EconomyAdminConfig): Good[] => {
  return config.goods.filter((good) => getGoodProfile(config, good.goodType).edible);
};

const parseConfigFileResponse = async (response: Response): Promise<ConfigFileApiResponse> => {
  const body = (await response.json()) as ConfigFileApiResponse;
  if (!response.ok) {
    throw new Error(body.error ?? `Config file request failed with ${response.status}`);
  }
  return body;
};

const getConfigFileApiUrl = (filePath: string): string => {
  return `${configFileApiPath}?filePath=${encodeURIComponent(filePath)}`;
};

const getSelectedRationTemplate = (config: EconomyAdminConfig): RationTemplate => {
  return (
    config.rationTemplates.find((template) => template.id === config.selectedRationTemplateId) ??
    config.rationTemplates[0] ?? {
      id: 'empty-ration',
      name: 'Empty ration',
      consumerId: config.consumers[0]?.id ?? '',
      items: [],
    }
  );
};

const getConsumerNeedProfile = (config: EconomyAdminConfig, consumerId: string): ConsumerNeedProfile => {
  const consumer = config.consumers.find((entry) => entry.id === consumerId) ?? config.consumers[0];
  return {
    id: consumer?.id ?? '',
    name: consumer?.name ?? 'Unknown',
    protein: consumer?.targetProtein ?? 0,
    energy: consumer?.targetEnergy ?? 0,
    water: consumer?.targetWater ?? 0,
    weightLbs: consumer?.targetWeightLbs ?? 0,
    taste: consumer?.targetTaste ?? 0,
  };
};

const getRationCalculatorItems = (config: EconomyAdminConfig, items: RationItem[]): RationCalculatorItem[] => {
  return items.map((item) => {
    const good = getGood(config, item.goodId);
    const profile = getGoodProfile(config, good.goodType);
    return {
      id: item.id,
      quantity: item.quantity,
      proteinPerUnit: profile.proteinRating,
      energyPerUnit: profile.energyRating,
      waterPerUnit: profile.waterRating,
      weightLbsPerUnit: profile.weightPerUnitLbs,
      costPerUnit: good.price,
      edible: profile.edible,
      valuableProteins: profile.valuableProteins,
      isLimited: good.goodType === spiceGoodType,
    };
  });
};

const calculateRation = (config: EconomyAdminConfig): RationResult => {
  const template = getSelectedRationTemplate(config);
  const target = getConsumerNeedProfile(config, template.consumerId);
  const calculatorResult = calculateRationNutrition({
    target,
    items: getRationCalculatorItems(config, template.items),
  });
  const lines = template.items.map((item, index) => {
    const good = getGood(config, item.goodId);
    const profile = getGoodProfile(config, good.goodType);
    const line = calculatorResult.lines[index];
    return {
      item,
      good,
      profile,
      protein: line?.protein ?? 0,
      energy: line?.energy ?? 0,
      water: line?.water ?? 0,
      weightLbs: line?.weightLbs ?? 0,
      cost: line?.cost ?? 0,
    };
  });
  return {
    template,
    target,
    lines,
    protein: calculatorResult.protein,
    energy: calculatorResult.energy,
    water: calculatorResult.water,
    weightLbs: calculatorResult.weightLbs,
    cost: calculatorResult.cost,
    taste: calculatorResult.taste,
    proteinRatio: calculatorResult.proteinRatio,
    energyRatio: calculatorResult.energyRatio,
    waterRatio: calculatorResult.waterRatio,
    weightRatio: calculatorResult.weightRatio,
    tasteRatio: calculatorResult.tasteRatio,
    hasValuableProteins: calculatorResult.hasValuableProteins,
  };
};

const solveRationItems = (config: EconomyAdminConfig, template: RationTemplate): RationItem[] => {
  const target = getConsumerNeedProfile(config, template.consumerId);
  const quantities = new Map(
    solveRationQuantities({
      target,
      items: getRationCalculatorItems(config, template.items),
      options: defaultRationSolverOptions,
    }).map((item) => [item.id, item.quantity]),
  );
  return template.items.map((item) => ({
    ...item,
    quantity: quantities.get(item.id) ?? item.quantity,
  }));
};

export {
  calculateRation,
  cloneConfig,
  configFileApiPath,
  configSyncDebounceMs,
  createUniqueName,
  defaultConfig,
  defaultConfigFilePath,
  filePathStorageKey,
  formatGoodLevel,
  formatNumber,
  getConfigFileApiUrl,
  getEdibleGoods,
  getGood,
  getGoodLevelName,
  getGoodProfile,
  normalizeConfig,
  parseConfigFileResponse,
  percentFactor,
  removeArrayItem,
  solveRationItems,
  storageKey,
  updateArrayItem,
};
