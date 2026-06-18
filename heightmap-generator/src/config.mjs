const DEFAULT_SECTOR_DIRECTIVES = Object.freeze([
  "ocean", "ocean", "continentNorthAmerica", "continentNorthAmerica", "ocean", "continentEurope", "continentEurope", "ocean",
  "ocean", "continentNorthAmerica", "continentNorthAmerica", "mountainBridge", "archipelago", "ocean", "continentEurope", "ocean",
  "ocean", "continentNorthAmerica", "archipelago", "mountainBridge", "archipelago", "ocean", "continentEurope", "ocean",
  "ocean", "ocean", "archipelago", "continentSouthAmerica", "ocean", "ocean", "continentEurope", "ocean",
]);

export const DEFAULT_CONFIG = Object.freeze({
  seed: -1,
  width: 2048,
  height: 1024,
  bitDepth: 16,
  count: 1,
  enableTectonics: true,
  enableBaseTerrain: true,
  enableContinentalMask: true,
  enableVoronoiFeatures: true,
  enableDomainWarping: true,
  enableThermalErosion: true,
  enableHydraulicErosion: true,
  enableRivers: true,
  enableSedimentation: true,
  enableAltitudeDetail: true,
  tectonicPlates: 20,
  boundaryInfluenceRadius: 30,
  boundaryFalloff: 2,
  tectonicBlurRadius: 5,
  tectonicBoundaryStrength: 0.9,
  seaLevel: 0.4,
  continentScale: 0.0005,
  continentTransition: 0.12,
  continentSeaDepth: 0.35,
  continentLandBoost: 0.12,
  ridgeScale: 0.0012,
  warpStrength: 50,
  warpScale: 0.002,
  voronoiFeatures: 30,
  voronoiStrength: 0.3,
  voronoiMinSize: 20,
  voronoiMaxSize: 100,
  thermalIterations: 12,
  talusAngle: 0.005,
  thermalErosionRate: 0.5,
  erosionIterations: 800000,
  erosionStrength: 0.12,
  depositionStrength: 0.08,
  dropletLife: 120,
  carryCapacity: 10,
  inertia: 0.15,
  evaporation: 0.015,
  riverCountFactor: 3.5,
  accumulationWeight: 0.85,
  riverCount: 7,
  riverMeander: 0.45,
  riverDeltaChance: 0.3,
  riverDeltaBranches: 3,
  riverOxbowChance: 0.08,
  sedimentationIterations: 5,
  sedimentationAmount: 0.001,
  altitudeDetailScale: 0.01,
  altitudeDetailOctaves: 4,
  finalBrightness: 1,
  finalBlurRadius: 0,
  planetSeaLevel: 0.52,
  planetCoastSoftness: 0.08,
  planetContinentScale: 2.4,
  planetTerrainScale: 5.2,
  planetOceanDepth: 0.55,
  planetRuggedness: 0.55,
  planetMountainBelts: 7,
  planetMountainStrength: 0.74,
  planetIslandArcs: 9,
  planetIslandDensity: 0.62,
  planetPolarIce: 0.18,
  planetEquatorFlattening: 0.04,
  sectorBridgeWidth: 0.42,
  sectorBridgeRidgeWidth: 0.6,
  sectorBridgeLandStrength: 0.26,
  sectorBridgeMountainStrength: 0.85,
  sectorArchipelagoStrength: 0.9,
  sectorEuropeStrength: 1,
  sectorColumns: 8,
  sectorRows: 4,
  sectorDirectives: DEFAULT_SECTOR_DIRECTIVES,
  planetStructure: "hexAtlantic",
});

const CONFIG_KEYS = new Map(
  Object.keys(DEFAULT_CONFIG).map((key) => [toSnakeCase(key), key]),
);

export function parseConfigText(text) {
  const config = { ...DEFAULT_CONFIG };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      throw new Error(`Invalid config line: ${rawLine}`);
    }

    const rawKey = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    const configKey = CONFIG_KEYS.get(rawKey);
    if (!configKey) {
      throw new Error(`Unknown config parameter: ${rawKey}`);
    }

    config[configKey] = parseValue(value, DEFAULT_CONFIG[configKey]);
  }

  return normalizeConfig(config);
}

export function normalizeConfig(config) {
  const width = Math.max(8, Math.floor(config.width));
  const height = Math.max(8, Math.floor(config.height));
  const bitDepth = Number(config.bitDepth) === 8 ? 8 : 16;

  return {
    ...config,
    width,
    height,
    bitDepth,
    count: Math.max(1, Math.floor(config.count)),
    tectonicPlates: Math.max(1, Math.floor(config.tectonicPlates)),
    boundaryInfluenceRadius: Math.max(1, config.boundaryInfluenceRadius),
    tectonicBlurRadius: Math.max(0, Math.floor(config.tectonicBlurRadius)),
    voronoiFeatures: Math.max(0, Math.floor(config.voronoiFeatures)),
    thermalIterations: Math.max(0, Math.floor(config.thermalIterations)),
    erosionIterations: Math.max(0, Math.floor(config.erosionIterations)),
    dropletLife: Math.max(1, Math.floor(config.dropletLife)),
    riverCount: Math.max(0, Math.floor(config.riverCount)),
    riverDeltaBranches: Math.max(0, Math.floor(config.riverDeltaBranches)),
    sedimentationIterations: Math.max(
      0,
      Math.floor(config.sedimentationIterations),
    ),
    altitudeDetailOctaves: Math.max(1, Math.floor(config.altitudeDetailOctaves)),
    finalBlurRadius: Math.max(0, Math.floor(config.finalBlurRadius)),
    planetMountainBelts: Math.max(0, Math.floor(config.planetMountainBelts)),
    planetIslandArcs: Math.max(0, Math.floor(config.planetIslandArcs)),
    sectorBridgeWidth: clamp(config.sectorBridgeWidth, 0.15, 0.9),
    sectorBridgeRidgeWidth: clamp(config.sectorBridgeRidgeWidth, 0.2, 0.85),
    sectorBridgeLandStrength: clamp(config.sectorBridgeLandStrength, 0, 0.7),
    sectorBridgeMountainStrength: clamp(config.sectorBridgeMountainStrength, 0, 1.6),
    sectorArchipelagoStrength: clamp(config.sectorArchipelagoStrength, 0, 1.6),
    sectorEuropeStrength: clamp(config.sectorEuropeStrength, 0.4, 1.8),
    sectorColumns: Math.max(1, Math.floor(config.sectorColumns)),
    sectorRows: Math.max(1, Math.floor(config.sectorRows)),
  };
}

export function withCliOverrides(config, overrides) {
  return normalizeConfig({
    ...config,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([, value]) => value !== undefined),
    ),
  });
}

function parseValue(value, defaultValue) {
  if (typeof defaultValue === "boolean") {
    if (value === "1" || value.toLowerCase() === "true") {
      return true;
    }
    if (value === "0" || value.toLowerCase() === "false") {
      return false;
    }
    throw new Error(`Expected boolean value, got: ${value}`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected numeric value, got: ${value}`);
  }
  return parsed;
}

function toSnakeCase(key) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function clamp(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return min;
  }
  return Math.min(max, Math.max(min, numericValue));
}
