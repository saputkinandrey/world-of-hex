"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
    Biome,
    CharacterSkill,
    CharacterTechnique,
    ConfigConsumerNeedProfile,
    GoodLevel,
    GoodProfile,
    ProductionChain,
    ProductionGoodQuantity,
    ProductionRecipe,
    RationTemplate,
    DomainAdminConfig,
    SkillDefault,
} from "@wohex/domain-data/economy";
import {
    calculateRation,
    cloneConfig,
    configFileApiPath,
    configSyncDebounceMs,
    createUniqueName,
    defaultConfig,
    defaultConfigFilePath,
    filePathStorageKey,
    getConfigFileApiUrl,
    getEdibleGoods,
    getGoodProfile,
    normalizeConfig,
    parseConfigFileResponse,
    removeArrayItem,
    solveRationItems,
    storageKey,
    updateArrayItem,
} from "../lib/domain-admin-utils";

export type DomainAdminTab =
    | "ration"
    | "goods"
    | "production"
    | "food"
    | "biomes"
    | "population"
    | "skills"
    | "techniques"
    | "creature-species"
    | "behavior-actions"
    | "world-traits"
    | "config";

export interface NavigationOption {
    value: DomainAdminTab;
    label: string;
}

export const foodNavigationOptions: NavigationOption[] = [
    { value: "population", label: "Consumers" },
    { value: "ration", label: "Rations" },
    { value: "food", label: "Food" },
];

export const economyNavigationOptions: NavigationOption[] = [
    { value: "goods", label: "Goods" },
    { value: "biomes", label: "Biomes" },
    { value: "production", label: "Production Chains" },
];

export const characterNavigationOptions: NavigationOption[] = [
    { value: "skills", label: "Skills" },
    { value: "techniques", label: "Techniques" },
    { value: "creature-species", label: "Creature Species" },
    { value: "behavior-actions", label: "Behavior Actions" },
    { value: "world-traits", label: "Memes, Morphs & Traits" },
];

const useDomainAdminState = () => {
    const [tab, setTab] = useState<DomainAdminTab>("ration");
    const [config, setConfig] = useState<DomainAdminConfig>(defaultConfig);
    const [configText, setConfigText] = useState("");
    const [isConfigTextDirty, setIsConfigTextDirty] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);
    const [fileStatus, setFileStatus] = useState<string | null>(null);
    const [configFilePathInput, setConfigFilePathInput] = useState(
        defaultConfigFilePath,
    );
    const [draggedGoodId, setDraggedGoodId] = useState<string | null>(null);
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);
    const [skillSearch, setSkillSearch] = useState("");
    const syncConfigState = (nextConfig: DomainAdminConfig) => {
        setConfig(nextConfig);
    };

    useEffect(() => {
        let cancelled = false;
        const loadInitialConfig = async () => {
            const storedFilePath =
                window.localStorage.getItem(filePathStorageKey) ??
                defaultConfigFilePath;
            if (!cancelled) {
                setConfigFilePathInput(storedFilePath);
            }
            try {
                const response = await fetch(
                    getConfigFileApiUrl(storedFilePath),
                    { cache: "no-store" },
                );
                const body = await parseConfigFileResponse(response);
                if (!body.config) {
                    throw new Error(
                        "Config file response did not include config",
                    );
                }
                if (!cancelled) {
                    const loadedConfig = normalizeConfig(body.config);
                    setConfig(loadedConfig);
                    setIsConfigTextDirty(false);
                    setConfigFilePathInput(body.filePath ?? storedFilePath);
                    setConfigError(null);
                }
                return;
            } catch {
                const raw = window.localStorage.getItem(storageKey);
                if (!raw) return;
                try {
                    if (!cancelled) {
                        const loadedConfig = normalizeConfig(
                            JSON.parse(raw) as DomainAdminConfig,
                        );
                        setConfig(loadedConfig);
                        setIsConfigTextDirty(false);
                    }
                } catch {
                    window.localStorage.removeItem(storageKey);
                }
            } finally {
                if (!cancelled) {
                    setIsConfigLoaded(true);
                }
            }
        };
        void loadInitialConfig();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!isConfigLoaded) return;
        const timeoutId = window.setTimeout(() => {
            window.localStorage.setItem(storageKey, JSON.stringify(config));
        }, configSyncDebounceMs);
        return () => window.clearTimeout(timeoutId);
    }, [config, isConfigLoaded]);

    useEffect(() => {
        if (!isConfigLoaded || tab !== "config" || isConfigTextDirty) return;
        const timeoutId = window.setTimeout(() => {
            setConfigText(JSON.stringify(config, null, 2));
        }, configSyncDebounceMs);
        return () => window.clearTimeout(timeoutId);
    }, [config, isConfigLoaded, isConfigTextDirty, tab]);

    const ration = useMemo(() => calculateRation(config), [config]);
    const selectedTemplateIndex = config.rationTemplates.findIndex(
        (template) => template.id === config.selectedRationTemplateId,
    );
    const selectedTemplate = ration.template;
    const edibleGoods = getEdibleGoods(config);
    const edibleGoodTypes = config.goodTypes.filter(
        (goodType) => getGoodProfile(config, goodType).edible,
    );
    const selectedProductionChainIndex = config.productionChains.findIndex(
        (chain) => chain.id === config.selectedProductionChainId,
    );
    const selectedProductionChain =
        config.productionChains[selectedProductionChainIndex] ??
        config.productionChains[0];
    const selectedSkillIndex = config.skills.findIndex(
        (skill) => skill.id === config.selectedSkillId,
    );
    const selectedSkill = config.skills[selectedSkillIndex] ?? config.skills[0];
    const selectedTechniqueIndex = config.techniques.findIndex(
        (technique) => technique.id === config.selectedTechniqueId,
    );
    const selectedTechnique =
        config.techniques[selectedTechniqueIndex] ?? config.techniques[0];
    const skillSearchText = skillSearch.trim().toLocaleLowerCase("ru-RU");
    const filteredSkills = config.skills.filter((skill) => {
        if (!skillSearchText) return true;
        return [skill.name, skill.category, skill.attribute, skill.difficulty]
            .join(" ")
            .toLocaleLowerCase("ru-RU")
            .includes(skillSearchText);
    });
    const foodNavigationValue = foodNavigationOptions.some(
        (option) => option.value === tab,
    )
        ? tab
        : "";
    const economyNavigationValue = economyNavigationOptions.some(
        (option) => option.value === tab,
    )
        ? tab
        : "";
    const characterNavigationValue = characterNavigationOptions.some(
        (option) => option.value === tab,
    )
        ? tab
        : "";

    const patchConfig = (patch: Partial<DomainAdminConfig>) =>
        syncConfigState({ ...config, ...patch });
    const updateSelectedRationTemplate = (patch: Partial<RationTemplate>) => {
        if (selectedTemplateIndex < 0) return;
        patchConfig({
            rationTemplates: updateArrayItem(
                config.rationTemplates,
                selectedTemplateIndex,
                patch,
            ),
        });
    };
    const addRationTemplate = () => {
        const id = `ration-template-${Date.now()}`;
        patchConfig({
            selectedRationTemplateId: id,
            rationTemplates: [
                ...config.rationTemplates,
                {
                    id,
                    name: `Рацион ${config.rationTemplates.length + 1}`,
                    consumerId: config.consumers[0]?.id ?? "",
                    items: [],
                },
            ],
        });
    };
    const duplicateRationTemplate = () => {
        const id = `ration-template-${Date.now()}`;
        patchConfig({
            selectedRationTemplateId: id,
            rationTemplates: [
                ...config.rationTemplates,
                {
                    ...selectedTemplate,
                    id,
                    name: `${selectedTemplate.name} copy`,
                    items: selectedTemplate.items.map((item, index) => ({
                        ...item,
                        id: `${id}-item-${index + 1}`,
                    })),
                },
            ],
        });
    };
    const deleteSelectedRationTemplate = () => {
        if (config.rationTemplates.length <= 1 || selectedTemplateIndex < 0)
            return;
        const nextTemplates = removeArrayItem(
            config.rationTemplates,
            selectedTemplateIndex,
        );
        patchConfig({
            rationTemplates: nextTemplates,
            selectedRationTemplateId: nextTemplates[0]?.id ?? "",
        });
    };
    const solveSelectedRation = () => {
        updateSelectedRationTemplate({
            items: solveRationItems(config, selectedTemplate),
        });
    };
    const addProductionChain = () => {
        const id = `production-chain-${Date.now()}`;
        patchConfig({
            selectedProductionChainId: id,
            productionChains: [
                ...config.productionChains,
                {
                    id,
                    name: `Production chain ${config.productionChains.length + 1}`,
                    recipes: [],
                },
            ],
        });
    };
    const updateSelectedProductionChain = (patch: Partial<ProductionChain>) => {
        if (selectedProductionChainIndex < 0) return;
        patchConfig({
            productionChains: updateArrayItem(
                config.productionChains,
                selectedProductionChainIndex,
                patch,
            ),
        });
    };
    const duplicateSelectedProductionChain = () => {
        if (!selectedProductionChain) return;
        const id = `production-chain-${Date.now()}`;
        patchConfig({
            selectedProductionChainId: id,
            productionChains: [
                ...config.productionChains,
                {
                    ...selectedProductionChain,
                    id,
                    name: `${selectedProductionChain.name} copy`,
                    recipes: selectedProductionChain.recipes.map(
                        (recipe, index) => ({
                            ...recipe,
                            id: `${id}-recipe-${index + 1}`,
                        }),
                    ),
                },
            ],
        });
    };
    const deleteSelectedProductionChain = () => {
        if (
            config.productionChains.length <= 1 ||
            selectedProductionChainIndex < 0
        )
            return;
        const deletedRecipeIds = new Set(
            selectedProductionChain.recipes.map((recipe) => recipe.id),
        );
        const nextChains = removeArrayItem(
            config.productionChains,
            selectedProductionChainIndex,
        );
        const nextTechniques = config.techniques
            .filter(
                (technique) =>
                    !deletedRecipeIds.has(technique.productionRecipeId),
            )
            .map((technique) => ({
                ...technique,
                prerequisiteTechniqueIds:
                    technique.prerequisiteTechniqueIds.filter((techniqueId) =>
                        config.techniques.some(
                            (candidate) =>
                                candidate.id === techniqueId &&
                                !deletedRecipeIds.has(
                                    candidate.productionRecipeId,
                                ),
                        ),
                    ),
            }));
        patchConfig({
            productionChains: nextChains,
            selectedProductionChainId: nextChains[0]?.id ?? "",
            techniques: nextTechniques,
            selectedTechniqueId: nextTechniques[0]?.id ?? "",
        });
    };
    const addProductionRecipe = () => {
        if (!selectedProductionChain) return;
        const goodId = config.goods[0]?.id ?? "";
        updateSelectedProductionChain({
            recipes: [
                ...selectedProductionChain.recipes,
                {
                    id: `production-step-${Date.now()}`,
                    inputs: [
                        {
                            id: `production-input-${Date.now()}`,
                            goodId,
                            quantity: 1,
                        },
                    ],
                    outputs: [
                        {
                            id: `production-output-${Date.now()}`,
                            goodId,
                            quantity: 1,
                        },
                    ],
                    preservesInputs: false,
                    durationMinutes: 0,
                    note: "",
                },
            ],
        });
    };
    const updateProductionRecipe = (
        index: number,
        patch: Partial<ProductionRecipe>,
    ) => {
        if (!selectedProductionChain) return;
        updateSelectedProductionChain({
            recipes: updateArrayItem(
                selectedProductionChain.recipes,
                index,
                patch,
            ),
        });
    };
    const deleteProductionRecipe = (index: number) => {
        if (!selectedProductionChain) return;
        const recipe = selectedProductionChain.recipes[index];
        if (!recipe) return;
        const deletedTechniqueIds = new Set(
            config.techniques
                .filter(
                    (technique) => technique.productionRecipeId === recipe.id,
                )
                .map((technique) => technique.id),
        );
        const nextTechniques = config.techniques
            .filter((technique) => technique.productionRecipeId !== recipe.id)
            .map((technique) => ({
                ...technique,
                prerequisiteTechniqueIds:
                    technique.prerequisiteTechniqueIds.filter(
                        (techniqueId) => !deletedTechniqueIds.has(techniqueId),
                    ),
            }));
        patchConfig({
            productionChains: updateArrayItem(
                config.productionChains,
                selectedProductionChainIndex,
                {
                    recipes: removeArrayItem(
                        selectedProductionChain.recipes,
                        index,
                    ),
                },
            ),
            techniques: nextTechniques,
            selectedTechniqueId: nextTechniques.some(
                (technique) => technique.id === config.selectedTechniqueId,
            )
                ? config.selectedTechniqueId
                : (nextTechniques[0]?.id ?? ""),
        });
    };
    const addProductionInput = (recipeIndex: number) => {
        if (!selectedProductionChain) return;
        const recipe = selectedProductionChain.recipes[recipeIndex];
        if (!recipe) return;
        const goodId = config.goods[0]?.id ?? "";
        updateProductionRecipe(recipeIndex, {
            inputs: [
                ...recipe.inputs,
                { id: `production-input-${Date.now()}`, goodId, quantity: 1 },
            ],
        });
    };
    const updateProductionInput = (
        recipeIndex: number,
        inputIndex: number,
        patch: Partial<ProductionGoodQuantity>,
    ) => {
        if (!selectedProductionChain) return;
        const recipe = selectedProductionChain.recipes[recipeIndex];
        if (!recipe) return;
        updateProductionRecipe(recipeIndex, {
            inputs: updateArrayItem(recipe.inputs, inputIndex, patch),
        });
    };
    const deleteProductionInput = (recipeIndex: number, inputIndex: number) => {
        if (!selectedProductionChain) return;
        const recipe = selectedProductionChain.recipes[recipeIndex];
        if (!recipe || recipe.inputs.length <= 1) return;
        updateProductionRecipe(recipeIndex, {
            inputs: removeArrayItem(recipe.inputs, inputIndex),
        });
    };
    const addProductionOutput = (recipeIndex: number) => {
        if (!selectedProductionChain) return;
        const recipe = selectedProductionChain.recipes[recipeIndex];
        if (!recipe) return;
        const goodId = config.goods[0]?.id ?? "";
        updateProductionRecipe(recipeIndex, {
            outputs: [
                ...recipe.outputs,
                { id: `production-output-${Date.now()}`, goodId, quantity: 1 },
            ],
        });
    };
    const updateProductionOutput = (
        recipeIndex: number,
        outputIndex: number,
        patch: Partial<ProductionGoodQuantity>,
    ) => {
        if (!selectedProductionChain) return;
        const recipe = selectedProductionChain.recipes[recipeIndex];
        if (!recipe) return;
        updateProductionRecipe(recipeIndex, {
            outputs: updateArrayItem(recipe.outputs, outputIndex, patch),
        });
    };
    const deleteProductionOutput = (
        recipeIndex: number,
        outputIndex: number,
    ) => {
        if (!selectedProductionChain) return;
        const recipe = selectedProductionChain.recipes[recipeIndex];
        if (!recipe || recipe.outputs.length <= 1) return;
        updateProductionRecipe(recipeIndex, {
            outputs: removeArrayItem(recipe.outputs, outputIndex),
        });
    };
    const createConsumerProfile = (): ConfigConsumerNeedProfile => {
        return {
            id: `consumer-${Date.now()}`,
            name: `Consumer ${config.consumers.length + 1}`,
            targetProtein: 10,
            targetEnergy: 60,
            targetWater: 30,
            targetWeightLbs: 3,
            targetTaste: 3,
            ageBands: [],
        };
    };
    const addConsumerProfile = () => {
        const consumer = createConsumerProfile();
        patchConfig({
            consumers: [...config.consumers, consumer],
            rationTemplates:
                selectedTemplateIndex >= 0
                    ? updateArrayItem(
                          config.rationTemplates,
                          selectedTemplateIndex,
                          { consumerId: consumer.id },
                      )
                    : config.rationTemplates,
        });
    };
    const updateConsumerProfile = (
        index: number,
        patch: Partial<ConfigConsumerNeedProfile>,
    ) => {
        patchConfig({
            consumers: updateArrayItem(config.consumers, index, patch),
        });
    };
    const deleteConsumerProfile = (consumerId: string) => {
        if (config.consumers.length <= 1) return;
        const fallbackConsumer = config.consumers.find(
            (consumer) => consumer.id !== consumerId,
        );
        if (!fallbackConsumer) return;
        patchConfig({
            consumers: config.consumers.filter(
                (consumer) => consumer.id !== consumerId,
            ),
            rationTemplates: config.rationTemplates.map((template) =>
                template.consumerId === consumerId
                    ? { ...template, consumerId: fallbackConsumer.id }
                    : template,
            ),
        });
    };
    const createCharacterSkill = (): CharacterSkill => {
        return {
            id: `skill-${Date.now()}`,
            name: `Skill ${config.skills.length + 1}`,
            category: "General",
            attribute: "IQ",
            difficulty: "Average",
            description: "",
            defaults: [],
            sourceSystem: "Custom",
        };
    };
    const addCharacterSkill = () => {
        const skill = createCharacterSkill();
        patchConfig({
            selectedSkillId: skill.id,
            skills: [...config.skills, skill],
        });
    };
    const updateSelectedSkill = (patch: Partial<CharacterSkill>) => {
        if (selectedSkillIndex < 0) return;
        patchConfig({
            skills: updateArrayItem(config.skills, selectedSkillIndex, patch),
        });
    };
    const duplicateSelectedSkill = () => {
        if (!selectedSkill) return;
        const id = `skill-${Date.now()}`;
        patchConfig({
            selectedSkillId: id,
            skills: [
                ...config.skills,
                {
                    ...selectedSkill,
                    id,
                    name: `${selectedSkill.name} copy`,
                    defaults: selectedSkill.defaults.map(
                        (skillDefault, index) => ({
                            ...skillDefault,
                            id: `${id}-default-${index + 1}`,
                        }),
                    ),
                    sourceSystem:
                        selectedSkill.sourceSystem === "Custom"
                            ? "Custom"
                            : `${selectedSkill.sourceSystem}; edited`,
                },
            ],
        });
    };
    const deleteSelectedSkill = () => {
        if (!selectedSkill || selectedSkillIndex < 0) return;
        const nextSkills = removeArrayItem(config.skills, selectedSkillIndex);
        const fallbackSkillId =
            nextSkills[Math.min(selectedSkillIndex, nextSkills.length - 1)]
                ?.id ?? "";
        patchConfig({
            skills: nextSkills,
            selectedSkillId: fallbackSkillId,
            techniques: config.techniques.map((technique) =>
                technique.baseSkillId === selectedSkill.id
                    ? { ...technique, baseSkillId: fallbackSkillId }
                    : technique,
            ),
        });
    };
    const addSkillDefault = () => {
        if (!selectedSkill) return;
        updateSelectedSkill({
            defaults: [
                ...selectedSkill.defaults,
                {
                    id: `skill-default-${Date.now()}`,
                    source: selectedSkill.attribute || "IQ",
                    modifier: -5,
                },
            ],
        });
    };
    const updateSkillDefault = (
        index: number,
        patch: Partial<SkillDefault>,
    ) => {
        if (!selectedSkill) return;
        updateSelectedSkill({
            defaults: updateArrayItem(selectedSkill.defaults, index, patch),
        });
    };
    const deleteSkillDefault = (index: number) => {
        if (!selectedSkill) return;
        updateSelectedSkill({
            defaults: removeArrayItem(selectedSkill.defaults, index),
        });
    };
    const createCharacterTechnique = (): CharacterTechnique => {
        const firstRecipe = config.productionChains.flatMap(
            (chain) => chain.recipes,
        )[0];
        return {
            id: `technique-${Date.now()}`,
            name: `Technique ${config.techniques.length + 1}`,
            baseSkillId: config.skills[0]?.id ?? "",
            productionRecipeId: firstRecipe?.id ?? "",
            difficultyPenalty: -1,
            maxRelativeLevel: 0,
            prerequisiteTechniqueIds: [],
            notes: "",
        };
    };
    const addCharacterTechnique = () => {
        const technique = createCharacterTechnique();
        patchConfig({
            selectedTechniqueId: technique.id,
            techniques: [...config.techniques, technique],
        });
    };
    const updateSelectedTechnique = (patch: Partial<CharacterTechnique>) => {
        if (selectedTechniqueIndex < 0) return;
        patchConfig({
            techniques: updateArrayItem(
                config.techniques,
                selectedTechniqueIndex,
                patch,
            ),
        });
    };
    const duplicateSelectedTechnique = () => {
        if (!selectedTechnique) return;
        const id = `technique-${Date.now()}`;
        patchConfig({
            selectedTechniqueId: id,
            techniques: [
                ...config.techniques,
                {
                    ...selectedTechnique,
                    id,
                    name: `${selectedTechnique.name} copy`,
                },
            ],
        });
    };
    const deleteSelectedTechnique = () => {
        if (!selectedTechnique || selectedTechniqueIndex < 0) return;
        const nextTechniques = removeArrayItem(
            config.techniques,
            selectedTechniqueIndex,
        ).map((technique) => ({
            ...technique,
            prerequisiteTechniqueIds: technique.prerequisiteTechniqueIds.filter(
                (techniqueId) => techniqueId !== selectedTechnique.id,
            ),
        }));
        patchConfig({
            techniques: nextTechniques,
            selectedTechniqueId:
                nextTechniques[
                    Math.min(selectedTechniqueIndex, nextTechniques.length - 1)
                ]?.id ?? "",
        });
    };
    const openTechnique = (techniqueId: string) => {
        if (
            !config.techniques.some((technique) => technique.id === techniqueId)
        )
            return;
        patchConfig({ selectedTechniqueId: techniqueId });
        setTab("techniques");
    };
    const addGoodType = () => {
        const goodType = createUniqueName("Good type", config.goodTypes);
        patchConfig({
            goodTypes: [...config.goodTypes, goodType],
            goodProfiles: [
                ...config.goodProfiles,
                {
                    goodType,
                    edible: true,
                    weightPerUnitLbs: 0.2,
                    proteinRating: 0,
                    energyRating: 0,
                    waterRating: 0,
                    valuableProteins: false,
                },
            ],
        });
    };
    const updateGoodTypeName = (index: number, goodType: string) => {
        const previousGoodType = config.goodTypes[index];
        if (previousGoodType === undefined) return;
        patchConfig({
            goodTypes: config.goodTypes.map((currentGoodType, currentIndex) =>
                currentIndex === index ? goodType : currentGoodType,
            ),
            goodProfiles: config.goodProfiles.map((profile) =>
                profile.goodType === previousGoodType
                    ? { ...profile, goodType }
                    : profile,
            ),
            goods: config.goods.map((good) =>
                good.goodType === previousGoodType
                    ? { ...good, goodType }
                    : good,
            ),
        });
    };
    const updateGoodTypeProfile = (
        goodType: string,
        patch: Partial<GoodProfile>,
    ) => {
        patchConfig({
            goodProfiles: config.goodProfiles.map((profile) =>
                profile.goodType === goodType
                    ? { ...profile, ...patch, goodType }
                    : profile,
            ),
        });
    };
    const deleteGoodType = (goodType: string) => {
        if (config.goodTypes.length <= 1) return;
        const fallbackGoodType = config.goodTypes.find(
            (currentGoodType) => currentGoodType !== goodType,
        );
        if (!fallbackGoodType) return;
        patchConfig({
            goodTypes: config.goodTypes.filter(
                (currentGoodType) => currentGoodType !== goodType,
            ),
            goodProfiles: config.goodProfiles.filter(
                (profile) => profile.goodType !== goodType,
            ),
            goods: config.goods.map((good) =>
                good.goodType === goodType
                    ? { ...good, goodType: fallbackGoodType }
                    : good,
            ),
        });
    };
    const addGoodLevel = () => {
        const nextLevel =
            config.goodLevels.reduce(
                (maxLevel, goodLevel) => Math.max(maxLevel, goodLevel.level),
                -1,
            ) + 1;
        patchConfig({
            goodLevels: [
                ...config.goodLevels,
                {
                    level: nextLevel,
                    name: `Level ${nextLevel}`,
                    description: "",
                },
            ],
        });
    };
    const updateGoodLevel = (index: number, patch: Partial<GoodLevel>) => {
        const previousLevel = config.goodLevels[index]?.level;
        if (previousLevel === undefined) return;
        const nextLevel = patch.level ?? previousLevel;
        patchConfig({
            goodLevels: updateArrayItem(config.goodLevels, index, patch),
            goods:
                previousLevel === nextLevel
                    ? config.goods
                    : config.goods.map((good) =>
                          good.level === previousLevel
                              ? {
                                    ...good,
                                    level: nextLevel,
                                    biomeIds:
                                        nextLevel === 0 ? good.biomeIds : [],
                                }
                              : good,
                      ),
        });
    };
    const deleteGoodLevel = (level: number) => {
        if (config.goodLevels.length <= 1) return;
        const fallbackLevel = config.goodLevels.find(
            (goodLevel) => goodLevel.level !== level,
        )?.level;
        if (fallbackLevel === undefined) return;
        patchConfig({
            goodLevels: config.goodLevels.filter(
                (goodLevel) => goodLevel.level !== level,
            ),
            goods: config.goods.map((good) =>
                good.level === level
                    ? {
                          ...good,
                          level: fallbackLevel,
                          biomeIds: fallbackLevel === 0 ? good.biomeIds : [],
                      }
                    : good,
            ),
        });
    };
    const deleteGood = (goodId: string) => {
        if (config.goods.length <= 1) return;
        patchConfig({
            goods: config.goods.filter((good) => good.id !== goodId),
            rationTemplates: config.rationTemplates.map((template) => ({
                ...template,
                items: template.items.filter((item) => item.goodId !== goodId),
            })),
            productionChains: config.productionChains.map((chain) => ({
                ...chain,
                recipes: chain.recipes
                    .map((recipe) => ({
                        ...recipe,
                        inputs: recipe.inputs.filter(
                            (input) => input.goodId !== goodId,
                        ),
                        outputs: recipe.outputs.filter(
                            (output) => output.goodId !== goodId,
                        ),
                    }))
                    .filter(
                        (recipe) =>
                            recipe.inputs.length > 0 &&
                            recipe.outputs.length > 0,
                    ),
            })),
        });
    };
    const addGoodBiome = (goodId: string, biomeId: string) => {
        const targetGood = config.goods.find((good) => good.id === goodId);
        if (!targetGood || targetGood.level !== 0) return;
        patchConfig({
            goods: config.goods.map((good) =>
                good.id === goodId && !good.biomeIds.includes(biomeId)
                    ? { ...good, biomeIds: [...good.biomeIds, biomeId] }
                    : good,
            ),
        });
    };
    const removeGoodBiome = (goodId: string, biomeId: string) => {
        patchConfig({
            goods: config.goods.map((good) =>
                good.id === goodId
                    ? {
                          ...good,
                          biomeIds: good.biomeIds.filter(
                              (currentBiomeId) => currentBiomeId !== biomeId,
                          ),
                      }
                    : good,
            ),
        });
    };
    const clearGoodBiomes = (goodId: string) => {
        patchConfig({
            goods: config.goods.map((good) =>
                good.id === goodId ? { ...good, biomeIds: [] } : good,
            ),
        });
    };
    const addBiome = () => {
        const id = `biome-${Date.now()}`;
        patchConfig({
            biomes: [
                ...config.biomes,
                { id, name: `Biome ${config.biomes.length + 1}` },
            ],
        });
    };
    const updateBiome = (index: number, patch: Partial<Biome>) => {
        patchConfig({ biomes: updateArrayItem(config.biomes, index, patch) });
    };
    const deleteBiome = (biomeId: string) => {
        patchConfig({
            biomes: config.biomes.filter((biome) => biome.id !== biomeId),
            goods: config.goods.map((good) => ({
                ...good,
                biomeIds: good.biomeIds.filter(
                    (currentBiomeId) => currentBiomeId !== biomeId,
                ),
            })),
        });
    };
    const handleGoodDrop = (biomeId: string) => {
        if (!draggedGoodId) return;
        const draggedGood = config.goods.find(
            (good) => good.id === draggedGoodId,
        );
        if (!draggedGood || draggedGood.level !== 0) {
            setDraggedGoodId(null);
            return;
        }
        if (biomeId) {
            addGoodBiome(draggedGoodId, biomeId);
        } else {
            clearGoodBiomes(draggedGoodId);
        }
        setDraggedGoodId(null);
    };

    const importConfigText = () => {
        try {
            syncConfigState(
                normalizeConfig(JSON.parse(configText) as DomainAdminConfig),
            );
            setIsConfigTextDirty(false);
            setConfigError(null);
            setFileStatus("JSON applied to local draft.");
        } catch (error) {
            setConfigError(
                error instanceof Error ? error.message : "Invalid JSON",
            );
        }
    };

    const resetConfig = () => {
        syncConfigState(cloneConfig(defaultConfig));
        setIsConfigTextDirty(false);
        setConfigError(null);
        setFileStatus("Local draft reset to bundled default config.");
    };

    const copyConfig = async () => {
        await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
        setFileStatus("JSON copied to clipboard.");
    };

    const loadConfigFromFile = async () => {
        try {
            const response = await fetch(
                getConfigFileApiUrl(configFilePathInput),
                { cache: "no-store" },
            );
            const body = await parseConfigFileResponse(response);
            if (!body.config) {
                throw new Error("Config file response did not include config");
            }
            syncConfigState(normalizeConfig(body.config));
            setIsConfigTextDirty(false);
            setConfigFilePathInput(body.filePath ?? configFilePathInput);
            window.localStorage.setItem(
                filePathStorageKey,
                body.filePath ?? configFilePathInput,
            );
            setConfigError(null);
            setFileStatus(
                `Loaded config from ${body.filePath ?? configFilePathInput}.`,
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to load config from disk";
            setConfigError(message);
            setFileStatus(null);
        }
    };

    const saveConfigToFile = async () => {
        try {
            const configToSave = config;
            const response = await fetch(configFileApiPath, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    config: configToSave,
                    filePath: configFilePathInput,
                }),
            });
            const body = await parseConfigFileResponse(response);
            syncConfigState(configToSave);
            setConfigFilePathInput(body.filePath ?? configFilePathInput);
            window.localStorage.setItem(
                filePathStorageKey,
                body.filePath ?? configFilePathInput,
            );
            setConfigError(null);
            setFileStatus(
                `Saved config to ${body.filePath ?? configFilePathInput}.`,
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to save config to disk";
            setConfigError(message);
            setFileStatus(null);
        }
    };

    return {
        tab,
        setTab,
        config,
        configText,
        setConfigText,
        isConfigTextDirty,
        setIsConfigTextDirty,
        configError,
        fileStatus,
        configFilePathInput,
        setConfigFilePathInput,
        draggedGoodId,
        setDraggedGoodId,
        skillSearch,
        setSkillSearch,
        ration,
        selectedTemplateIndex,
        selectedTemplate,
        edibleGoods,
        edibleGoodTypes,
        selectedProductionChainIndex,
        selectedProductionChain,
        selectedSkillIndex,
        selectedSkill,
        selectedTechniqueIndex,
        selectedTechnique,
        filteredSkills,
        foodNavigationValue,
        economyNavigationValue,
        characterNavigationValue,
        syncConfigState,
        patchConfig,
        updateSelectedRationTemplate,
        addRationTemplate,
        duplicateRationTemplate,
        deleteSelectedRationTemplate,
        solveSelectedRation,
        addProductionChain,
        updateSelectedProductionChain,
        duplicateSelectedProductionChain,
        deleteSelectedProductionChain,
        addProductionRecipe,
        updateProductionRecipe,
        deleteProductionRecipe,
        addProductionInput,
        updateProductionInput,
        deleteProductionInput,
        addProductionOutput,
        updateProductionOutput,
        deleteProductionOutput,
        addConsumerProfile,
        updateConsumerProfile,
        deleteConsumerProfile,
        addCharacterSkill,
        updateSelectedSkill,
        duplicateSelectedSkill,
        deleteSelectedSkill,
        addSkillDefault,
        updateSkillDefault,
        deleteSkillDefault,
        addCharacterTechnique,
        updateSelectedTechnique,
        duplicateSelectedTechnique,
        deleteSelectedTechnique,
        openTechnique,
        addGoodType,
        updateGoodTypeName,
        updateGoodTypeProfile,
        deleteGoodType,
        addGoodLevel,
        updateGoodLevel,
        deleteGoodLevel,
        deleteGood,
        addGoodBiome,
        removeGoodBiome,
        clearGoodBiomes,
        addBiome,
        updateBiome,
        deleteBiome,
        handleGoodDrop,
        importConfigText,
        resetConfig,
        copyConfig,
        loadConfigFromFile,
        saveConfigToFile,
    };
};

export type DomainAdminContextValue = ReturnType<typeof useDomainAdminState>;

const DomainAdminContext = createContext<DomainAdminContextValue | null>(
    null,
);

export type ConfigProviderProps = {
    children: React.ReactNode;
};

export const DomainAdminProvider = ({ children }: ConfigProviderProps) => {
    const value = useDomainAdminState();
    return (
        <DomainAdminContext.Provider value={value}>
            {children}
        </DomainAdminContext.Provider>
    );
};

export const useDomainAdmin = (): DomainAdminContextValue => {
    const value = useContext(DomainAdminContext);
    if (!value) {
        throw new Error(
            "useDomainAdmin must be used inside DomainAdminProvider",
        );
    }
    return value;
};
