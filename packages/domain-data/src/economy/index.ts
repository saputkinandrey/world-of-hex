import biomesJson from "./data/biomes.json";
import consumersJson from "./data/consumers.json";
import goodLevelsJson from "./data/good-levels.json";
import goodProfilesJson from "./data/good-profiles.json";
import goodTypesJson from "./data/good-types.json";
import goodsJson from "./data/goods.json";
import productionChainsJson from "./data/production-chains.json";
import rationTemplatesJson from "./data/ration-templates.json";
import selectedIdsJson from "./data/selected-ids.json";
import skillsJson from "./data/skills.json";
import techniquesJson from "./data/techniques.json";
import type { DomainAdminConfig } from "./entities";

export * from "./entities";

export const defaultEconomyConfigDirectoryPath =
    "packages/domain-data/src/economy/data";

export const defaultEconomyConfigFilePath = defaultEconomyConfigDirectoryPath;

export const economyConfigSectionFileNames = {
    biomes: "biomes.json",
    consumers: "consumers.json",
    goodLevels: "good-levels.json",
    goodProfiles: "good-profiles.json",
    goodTypes: "good-types.json",
    goods: "goods.json",
    productionChains: "production-chains.json",
    rationTemplates: "ration-templates.json",
    selectedIds: "selected-ids.json",
    skills: "skills.json",
    techniques: "techniques.json",
} as const;

export const defaultEconomyConfig = {
    goodTypes: goodTypesJson,
    goodProfiles: goodProfilesJson,
    goodLevels: goodLevelsJson,
    biomes: biomesJson,
    goods: goodsJson,
    consumers: consumersJson,
    selectedRationTemplateId: selectedIdsJson.selectedRationTemplateId,
    rationTemplates: rationTemplatesJson,
    selectedProductionChainId: selectedIdsJson.selectedProductionChainId,
    productionChains: productionChainsJson,
    selectedSkillId: selectedIdsJson.selectedSkillId,
    skills: skillsJson,
    selectedTechniqueId: selectedIdsJson.selectedTechniqueId,
    techniques: techniquesJson,
} as DomainAdminConfig;
