'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type GenerationStage =
  | 'enableTectonics'
  | 'enableBaseTerrain'
  | 'enableContinentalMask'
  | 'enableVoronoiFeatures'
  | 'enableDomainWarping'
  | 'enableThermalErosion'
  | 'enableHydraulicErosion'
  | 'enableRivers'
  | 'enableSedimentation'
  | 'enableAltitudeDetail';

type NumericConfigKey =
  | 'seed'
  | 'width'
  | 'height'
  | 'bitDepth'
  | 'tectonicPlates'
  | 'boundaryInfluenceRadius'
  | 'tectonicBoundaryStrength'
  | 'seaLevel'
  | 'continentScale'
  | 'continentTransition'
  | 'continentSeaDepth'
  | 'continentLandBoost'
  | 'ridgeScale'
  | 'warpStrength'
  | 'voronoiFeatures'
  | 'thermalIterations'
  | 'erosionIterations'
  | 'erosionStrength'
  | 'dropletLife'
  | 'riverCountFactor'
  | 'riverCount'
  | 'riverMeander'
  | 'sedimentationIterations'
  | 'altitudeDetailScale'
  | 'altitudeDetailOctaves'
  | 'finalBrightness'
  | 'finalBlurRadius'
  | 'planetSeaLevel'
  | 'planetCoastSoftness'
  | 'planetContinentScale'
  | 'planetTerrainScale'
  | 'planetOceanDepth'
  | 'planetRuggedness'
  | 'planetMountainBelts'
  | 'planetMountainStrength'
  | 'planetIslandArcs'
  | 'planetIslandDensity'
  | 'planetPolarIce'
  | 'planetEquatorFlattening'
  | 'sectorBridgeWidth'
  | 'sectorBridgeRidgeWidth'
  | 'sectorBridgeLandStrength'
  | 'sectorBridgeMountainStrength'
  | 'sectorArchipelagoStrength'
  | 'sectorEuropeStrength'
  | 'sectorColumns'
  | 'sectorRows';

type SectorDirective =
  | 'free'
  | 'ocean'
  | 'archipelago'
  | 'mountainBridge'
  | 'continentNorthAmerica'
  | 'continentSouthAmerica'
  | 'continentEurope'
  | 'continentAsia'
  | 'continentAustralia';

type ReferenceRole = 'shape' | 'relief' | 'ridges' | 'rivers';

interface ReferenceFieldPayload {
  role: ReferenceRole;
  strength: number;
  inverted: boolean;
  width: number;
  height: number;
  values: string;
}

interface ReferenceLayer {
  id: string;
  name: string;
  previewUrl: string;
  field: ReferenceFieldPayload;
}

interface ReferenceLayerPatch {
  role?: ReferenceRole;
  strength?: number;
  inverted?: boolean;
}

interface HeightmapConfig extends Record<GenerationStage, boolean>, Record<NumericConfigKey, number> {
  count: number;
  boundaryFalloff: number;
  tectonicBlurRadius: number;
  warpScale: number;
  voronoiStrength: number;
  voronoiMinSize: number;
  voronoiMaxSize: number;
  talusAngle: number;
  thermalErosionRate: number;
  depositionStrength: number;
  carryCapacity: number;
  inertia: number;
  evaporation: number;
  accumulationWeight: number;
  riverDeltaChance: number;
  riverDeltaBranches: number;
  riverOxbowChance: number;
  sedimentationAmount: number;
  sectorDirectives: SectorDirective[];
}

interface StageControl {
  key: GenerationStage;
  label: string;
}

interface NumberControl {
  key: NumericConfigKey;
  label: string;
  min: number;
  max: number;
  step: number;
}

interface Preset {
  id: string;
  label: string;
  patch: Partial<HeightmapConfig>;
}

interface SectorLayout {
  version: number;
  sectorColumns: number;
  sectorRows: number;
  sectorDirectives: SectorDirective[];
}

interface PreviewRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StoredHeightmapState {
  version: number;
  config: Partial<HeightmapConfig>;
  sectorBrush?: SectorDirective;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

interface NumberControlFieldProps {
  control: NumberControl;
  config: HeightmapConfig;
  onChange: (key: NumericConfigKey, value: number) => void;
}

const defaultConfig: HeightmapConfig = {
  seed: 421337,
  width: 2048,
  height: 1024,
  bitDepth: 8,
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
  tectonicPlates: 18,
  boundaryInfluenceRadius: 22,
  boundaryFalloff: 2,
  tectonicBlurRadius: 4,
  tectonicBoundaryStrength: 0.9,
  seaLevel: 0.42,
  continentScale: 0.0008,
  continentTransition: 0.12,
  continentSeaDepth: 0.35,
  continentLandBoost: 0.12,
  ridgeScale: 0.0018,
  warpStrength: 28,
  warpScale: 0.003,
  voronoiFeatures: 18,
  voronoiStrength: 0.26,
  voronoiMinSize: 10,
  voronoiMaxSize: 55,
  thermalIterations: 8,
  talusAngle: 0.005,
  thermalErosionRate: 0.45,
  erosionIterations: 12000,
  erosionStrength: 0.1,
  depositionStrength: 0.07,
  dropletLife: 80,
  carryCapacity: 8,
  inertia: 0.15,
  evaporation: 0.018,
  riverCountFactor: 3,
  accumulationWeight: 0.78,
  riverCount: 6,
  riverMeander: 0.45,
  riverDeltaChance: 0.28,
  riverDeltaBranches: 3,
  riverOxbowChance: 0.08,
  sedimentationIterations: 3,
  sedimentationAmount: 0.001,
  altitudeDetailScale: 0.012,
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
  sectorDirectives: [
    'ocean', 'ocean', 'continentNorthAmerica', 'continentNorthAmerica', 'ocean', 'continentEurope', 'continentEurope', 'ocean',
    'ocean', 'continentNorthAmerica', 'continentNorthAmerica', 'mountainBridge', 'archipelago', 'ocean', 'continentEurope', 'ocean',
    'ocean', 'continentNorthAmerica', 'archipelago', 'mountainBridge', 'archipelago', 'ocean', 'continentEurope', 'ocean',
    'ocean', 'ocean', 'archipelago', 'continentSouthAmerica', 'ocean', 'ocean', 'continentEurope', 'ocean',
  ],
};

const stages: StageControl[] = [
  { key: 'enableTectonics', label: 'Тектоника плит' },
  { key: 'enableBaseTerrain', label: 'Базовый рельеф' },
  { key: 'enableContinentalMask', label: 'Континенты и океан' },
  { key: 'enableVoronoiFeatures', label: 'Вулканы, кратеры, плато' },
  { key: 'enableDomainWarping', label: 'Искривление форм' },
  { key: 'enableThermalErosion', label: 'Термальная эрозия' },
  { key: 'enableHydraulicErosion', label: 'Гидравлическая эрозия' },
  { key: 'enableRivers', label: 'Крупные реки' },
  { key: 'enableSedimentation', label: 'Седиментация' },
  { key: 'enableAltitudeDetail', label: 'Высотная детализация' },
];

const hydrologyStages = stages.filter(
  ({ key }) => key === 'enableHydraulicErosion' || key === 'enableRivers',
);

const hydrologyControls: NumberControl[] = [
  {
    key: 'erosionIterations',
    label: 'Интенсивность эрозии',
    min: 0,
    max: 80000,
    step: 1000,
  },
  {
    key: 'erosionStrength',
    label: 'Глубина русел',
    min: 0,
    max: 0.3,
    step: 0.01,
  },
  {
    key: 'riverCount',
    label: 'Плотность речной сети',
    min: 0,
    max: 24,
    step: 1,
  },
];

const terrainControls: NumberControl[] = [
  { key: 'tectonicPlates', label: 'Плит', min: 3, max: 50, step: 1 },
  { key: 'boundaryInfluenceRadius', label: 'Радиус границ', min: 4, max: 80, step: 1 },
  { key: 'tectonicBoundaryStrength', label: 'Сила хребтов', min: 0, max: 2, step: 0.05 },
  { key: 'ridgeScale', label: 'Масштаб хребтов', min: 0.0005, max: 0.006, step: 0.0001 },
  { key: 'warpStrength', label: 'Искривление', min: 0, max: 120, step: 1 },
  { key: 'voronoiFeatures', label: 'Гео-объекты', min: 0, max: 80, step: 1 },
];

const worldControls: NumberControl[] = [
  { key: 'seaLevel', label: 'Уровень моря', min: 0, max: 1, step: 0.01 },
  { key: 'continentScale', label: 'Размер континентов', min: 0.0001, max: 0.006, step: 0.0001 },
  { key: 'continentTransition', label: 'Ширина побережья', min: 0.02, max: 0.35, step: 0.01 },
  { key: 'continentSeaDepth', label: 'Глубина океана', min: 0, max: 1, step: 0.01 },
  { key: 'continentLandBoost', label: 'Подъем суши', min: 0, max: 0.45, step: 0.01 },
];

const waterControls: NumberControl[] = [
  { key: 'erosionIterations', label: 'Капли эрозии', min: 0, max: 80000, step: 1000 },
  { key: 'dropletLife', label: 'Жизнь капли', min: 10, max: 200, step: 5 },
  { key: 'riverCount', label: 'Крупные реки', min: 0, max: 24, step: 1 },
  { key: 'riverMeander', label: 'Извилистость', min: 0, max: 1, step: 0.01 },
  { key: 'riverCountFactor', label: 'Ширина русел', min: 0.5, max: 8, step: 0.1 },
  { key: 'sedimentationIterations', label: 'Седиментация', min: 0, max: 12, step: 1 },
];

const detailControls: NumberControl[] = [
  { key: 'thermalIterations', label: 'Осыпание склонов', min: 0, max: 30, step: 1 },
  { key: 'altitudeDetailScale', label: 'Масштаб деталей', min: 0.001, max: 0.05, step: 0.001 },
  { key: 'altitudeDetailOctaves', label: 'Октавы деталей', min: 1, max: 8, step: 1 },
  { key: 'finalBrightness', label: 'Яркость', min: 0.4, max: 1.8, step: 0.05 },
  { key: 'finalBlurRadius', label: 'Финальное размытие', min: 0, max: 4, step: 1 },
];

const planetControls: NumberControl[] = [
  { key: 'planetSeaLevel', label: 'Порог океана', min: 0.35, max: 0.7, step: 0.01 },
  { key: 'planetCoastSoftness', label: 'Мягкость берегов', min: 0.02, max: 0.2, step: 0.01 },
  { key: 'planetContinentScale', label: 'Масштаб материков', min: 1.2, max: 5, step: 0.1 },
  { key: 'planetTerrainScale', label: 'Масштаб рельефа', min: 2, max: 10, step: 0.1 },
  { key: 'planetOceanDepth', label: 'Глубина океана', min: 0.1, max: 1, step: 0.05 },
  { key: 'planetRuggedness', label: 'Пересеченность суши', min: 0, max: 1.4, step: 0.05 },
  { key: 'planetMountainBelts', label: 'Горные пояса', min: 0, max: 16, step: 1 },
  { key: 'planetMountainStrength', label: 'Высота гор', min: 0, max: 1.5, step: 0.05 },
  { key: 'planetIslandArcs', label: 'Островные дуги', min: 0, max: 24, step: 1 },
  { key: 'planetIslandDensity', label: 'Плотность островов', min: 0, max: 1.5, step: 0.05 },
  { key: 'planetPolarIce', label: 'Полярные области', min: 0, max: 0.5, step: 0.01 },
  { key: 'planetEquatorFlattening', label: 'Экваториальные низины', min: 0, max: 0.25, step: 0.01 },
];

const sectorControls: NumberControl[] = [
  { key: 'sectorColumns', label: 'Секторов по горизонтали', min: 4, max: 16, step: 1 },
  { key: 'sectorRows', label: 'Секторов по вертикали', min: 2, max: 8, step: 1 },
];

const sectorProfileControls: NumberControl[] = [
  { key: 'sectorBridgeWidth', label: 'Перемычка: ширина суши', min: 0.15, max: 0.9, step: 0.01 },
  { key: 'sectorBridgeRidgeWidth', label: 'Перемычка: ширина хребта', min: 0.2, max: 0.85, step: 0.01 },
  { key: 'sectorBridgeLandStrength', label: 'Перемычка: сила суши', min: 0, max: 0.7, step: 0.01 },
  { key: 'sectorBridgeMountainStrength', label: 'Перемычка: высота хребта', min: 0, max: 1.6, step: 0.01 },
  { key: 'sectorArchipelagoStrength', label: 'Архипелаг: острова', min: 0, max: 1.6, step: 0.01 },
  { key: 'sectorEuropeStrength', label: 'Европа: малые массивы', min: 0.4, max: 1.8, step: 0.01 },
];

const maxPreviewWidth = 1024;
const storedStateVersion = 1;
const storedStateKey = 'world-of-hex.heightmap-generator.state.v1';
const referenceFieldWidth = 512;
const referenceFieldHeight = 256;
const maximumReferenceLayers = 8;

const referenceRoleLabels: Record<ReferenceRole, string> = {
  shape: 'Форма высот',
  relief: 'Детали рельефа',
  ridges: 'Хребты',
  rivers: 'Русла',
};

const presets: Preset[] = [
  { id: 'balanced', label: 'Сбалансированный мир', patch: {} },
  {
    id: 'archipelago',
    label: 'Архипелаг',
    patch: { seaLevel: 0.62, continentScale: 0.0015, voronoiFeatures: 36, riverCount: 4, continentSeaDepth: 0.48 },
  },
  {
    id: 'mountains',
    label: 'Горный хребет',
    patch: { tectonicPlates: 8, boundaryInfluenceRadius: 48, tectonicBoundaryStrength: 1.55, voronoiFeatures: 4, thermalIterations: 5, seaLevel: 0.34 },
  },
  {
    id: 'riverlands',
    label: 'Равнина с реками',
    patch: { enableTectonics: false, enableVoronoiFeatures: false, seaLevel: 0.32, erosionIterations: 52000, riverCount: 14, riverCountFactor: 6, thermalIterations: 18 },
  },
  {
    id: 'hex-atlantic',
    label: 'Hex: Америка - Карибы - Европа',
    patch: {
      width: 2048,
      height: 1024,
      sectorColumns: 8,
      sectorRows: 4,
      planetSeaLevel: 0.53,
      planetContinentScale: 2.2,
      planetMountainBelts: 8,
      planetIslandArcs: 12,
      planetIslandDensity: 0.82,
      sectorDirectives: [
        'ocean', 'ocean', 'continentNorthAmerica', 'continentNorthAmerica', 'ocean', 'continentEurope', 'continentEurope', 'ocean',
        'ocean', 'continentNorthAmerica', 'continentNorthAmerica', 'mountainBridge', 'archipelago', 'ocean', 'continentEurope', 'ocean',
        'ocean', 'continentNorthAmerica', 'archipelago', 'mountainBridge', 'archipelago', 'ocean', 'continentEurope', 'ocean',
        'ocean', 'ocean', 'archipelago', 'continentSouthAmerica', 'ocean', 'ocean', 'continentEurope', 'ocean',
      ],
    },
  },
];

const sectorDirectiveOrder: SectorDirective[] = [
  'free',
  'ocean',
  'archipelago',
  'mountainBridge',
  'continentNorthAmerica',
  'continentSouthAmerica',
  'continentEurope',
  'continentAsia',
  'continentAustralia',
];
const sectorDirectiveLabels: Record<SectorDirective, string> = {
  free: 'Свободно',
  ocean: 'Океан',
  archipelago: 'Архипелаг',
  mountainBridge: 'Горная перемычка',
  continentNorthAmerica: 'Континент: Сев. Америка',
  continentSouthAmerica: 'Континент: Юж. Америка',
  continentEurope: 'Континент: Европа',
  continentAsia: 'Континент: Азия',
  continentAustralia: 'Континент: Австралия',
};

export default function HeightmapAdminPage() {
  const [config, setConfig] = useState<HeightmapConfig>(defaultConfig);
  const [status, setStatus] = useState('Готов к генерации');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [layoutMessage, setLayoutMessage] = useState<string | null>(null);
  const [sectorBrush, setSectorBrush] = useState<SectorDirective>('ocean');
  const [referenceLayers, setReferenceLayers] = useState<ReferenceLayer[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullPreviewTimerRef = useRef<number | null>(null);
  const previewRequestRef = useRef(0);
  const previewReadyRef = useRef(false);

  const directedSectorCount = useMemo(
    () => normalizeSectorDirectives(config).filter((directive) => directive !== 'free').length,
    [config],
  );
  const sectorLayoutDownloadHref = useMemo(
    () => createSectorLayoutDataUrl(createSectorLayout(config)),
    [config],
  );

  const setNumber = (key: NumericConfigKey, value: number) => {
    if (key === 'sectorColumns' || key === 'sectorRows') {
      setConfig((current) => {
        const nextConfig = resizeSectorGrid({ ...current, [key]: value } as HeightmapConfig, current.sectorColumns);
        scheduleFullPreview(nextConfig);
        return nextConfig;
      });
      return;
    }

    setConfig((current) => {
      const nextConfig = { ...current, [key]: value } as HeightmapConfig;
      scheduleFullPreview(nextConfig);
      return nextConfig;
    });
  };

  const setStage = (key: GenerationStage, value: boolean) => {
    setConfig((current) => {
      const nextConfig = { ...current, [key]: value } as HeightmapConfig;
      scheduleFullPreview(nextConfig);
      return nextConfig;
    });
  };

  const setResolution = (size: number) => {
    setConfig((current) => {
      const nextConfig = { ...current, width: size, height: Math.floor(size / 2) };
      scheduleFullPreview(nextConfig);
      return nextConfig;
    });
  };

  const applyPreset = (preset: Preset) => {
    const nextConfig = resizeSectorGrid({ ...defaultConfig, ...preset.patch });
    setConfig(nextConfig);
    scheduleFullPreview(nextConfig);
  };

  const paintSectorDirective = (index: number) => {
    setConfig((current) => {
      const directives = normalizeSectorDirectives(current);
      directives[index] = sectorBrush;
      const nextConfig = { ...current, sectorDirectives: directives };
      void generatePreviewRegion(nextConfig, sectorDirtyRegion(nextConfig, index));
      return nextConfig;
    });
  };

  const importSectorLayout = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      applySectorLayout(await file.text());
      setLayoutMessage('Раскладка загружена.');
    } catch (layoutError) {
      setLayoutMessage(layoutError instanceof Error ? layoutError.message : 'Не удалось загрузить раскладку.');
    }
  };

  const copySectorLayoutLink = async () => {
    const encoded = encodeSectorLayout(createSectorLayout(config));
    const url = `${window.location.origin}${window.location.pathname}#sectors=${encoded}`;
    window.history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
      setLayoutMessage('Ссылка на раскладку скопирована.');
    } catch {
      setLayoutMessage('Ссылка записана в адресную строку.');
    }
  };

  const applySectorLayout = (text: string) => {
    const layout = parseSectorLayout(text);
    setConfig((current) => {
      const nextConfig = resizeSectorGrid({ ...current, ...layout }, layout.sectorColumns);
      scheduleFullPreview(nextConfig);
      return nextConfig;
    });
  };

  const generatePreview = async (
    sourceConfig = config,
    sourceReferences = referenceLayers,
  ) => {
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setIsGenerating(true);
    setError(null);
    setStatus('Генерация карты...');
    const previewConfig = createPreviewConfig(sourceConfig);

    try {
      const response = await fetch('/api/heightmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: previewConfig,
          mode: 'preview',
          referenceFields: referenceFieldsOf(sourceReferences),
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? `Generation failed with ${response.status}`);
      }

      const blob = await response.blob();
      if (requestId !== previewRequestRef.current) {
        return;
      }

      const seed = response.headers.get('X-Heightmap-Seed') ?? String(sourceConfig.seed);
      await drawPreviewBlob(blob, previewConfig);
      const previewNote = previewConfig.width === sourceConfig.width ? '' : `, preview ${previewConfig.width}x${previewConfig.height}`;
      setStatus(`Готово: export ${sourceConfig.width}x${sourceConfig.height}${previewNote}, seed ${seed}`);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Не удалось сгенерировать карту.');
      setStatus('Ошибка генерации');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePreviewRegion = async (
    sourceConfig: HeightmapConfig,
    region: PreviewRegion,
    sourceReferences = referenceLayers,
  ) => {
    const previewConfig = createPreviewConfig(sourceConfig);
    const canvas = canvasRef.current;
    if (!canvas || !previewReadyRef.current || canvas.width !== previewConfig.width || canvas.height !== previewConfig.height) {
      scheduleFullPreview(sourceConfig);
      return;
    }

    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setError(null);
    setStatus(`Обновление сектора: ${region.width}x${region.height}`);

    try {
      const response = await fetch('/api/heightmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: previewConfig,
          mode: 'preview',
          referenceFields: referenceFieldsOf(sourceReferences),
          region,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? `Tile generation failed with ${response.status}`);
      }

      const blob = await response.blob();
      if (requestId !== previewRequestRef.current) {
        return;
      }

      await drawPreviewBlob(blob, previewConfig, region);
      setStatus(`Обновлен сектор: ${region.width}x${region.height}`);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Не удалось обновить сектор.');
      setStatus('Ошибка обновления сектора');
    }
  };

  const scheduleFullPreview = (
    sourceConfig: HeightmapConfig,
    sourceReferences = referenceLayers,
  ) => {
    if (fullPreviewTimerRef.current) {
      window.clearTimeout(fullPreviewTimerRef.current);
    }

    fullPreviewTimerRef.current = window.setTimeout(() => {
      void generatePreview(sourceConfig, sourceReferences);
    }, 350);
  };

  const drawPreviewBlob = async (blob: Blob, previewConfig: HeightmapConfig, region?: PreviewRegion) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (!region || canvas.width !== previewConfig.width || canvas.height !== previewConfig.height) {
      canvas.width = previewConfig.width;
      canvas.height = previewConfig.height;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const image = await loadBlobImage(blob);
    context.drawImage(image, region?.x ?? 0, region?.y ?? 0);
    previewReadyRef.current = true;
  };

  useEffect(() => {
    let nextConfig = defaultConfig;
    let nextSectorBrush = sectorBrush;

    try {
      const storedState = readStoredHeightmapState();
      if (storedState) {
        nextConfig = normalizeStoredConfig(storedState.config);
        if (storedState.sectorBrush && sectorDirectiveOrder.includes(storedState.sectorBrush)) {
          nextSectorBrush = storedState.sectorBrush;
        }
      }
    } catch (storageError) {
      setLayoutMessage(storageError instanceof Error ? storageError.message : 'Saved settings could not be loaded.');
    }

    const encodedLayout = window.location.hash.startsWith('#sectors=')
      ? window.location.hash.slice('#sectors='.length)
      : '';
    if (encodedLayout) {
      try {
        const layout = parseSectorLayout(decodeURIComponent(atob(encodedLayout)));
        nextConfig = resizeSectorGrid({ ...nextConfig, ...layout }, layout.sectorColumns);
      } catch {
        setLayoutMessage('Ссылка с раскладкой повреждена.');
      }
    }
    setConfig(nextConfig);
    setSectorBrush(nextSectorBrush);
    setIsStorageReady(true);
    void generatePreview(nextConfig);
    return () => {
      if (fullPreviewTimerRef.current) {
        window.clearTimeout(fullPreviewTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    try {
      writeStoredHeightmapState({
        version: storedStateVersion,
        config,
        sectorBrush,
      });
    } catch (storageError) {
      setLayoutMessage(storageError instanceof Error ? storageError.message : 'Saved settings could not be written.');
    }
  }, [config, isStorageReady, sectorBrush]);

  const randomizeSeed = () => {
    const seed = Math.floor(Math.random() * 0xffffffff);
    setConfig((current) => {
      const nextConfig = { ...current, seed };
      scheduleFullPreview(nextConfig);
      return nextConfig;
    });
  };

  const addReferenceFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    try {
      const capacity = maximumReferenceLayers - referenceLayers.length;
      if (capacity <= 0) {
        throw new Error(`Можно использовать не больше ${maximumReferenceLayers} референсов.`);
      }

      const addedLayers = await Promise.all(
        Array.from(files)
          .slice(0, capacity)
          .map((file) => createReferenceLayer(file)),
      );
      const nextLayers = [...referenceLayers, ...addedLayers];
      setReferenceLayers(nextLayers);
      await generatePreview(config, nextLayers);
    } catch (referenceError) {
      setError(referenceError instanceof Error ? referenceError.message : 'Не удалось прочитать референсы.');
    }
  };

  const updateReferenceLayer = (id: string, patch: ReferenceLayerPatch) => {
    const nextLayers = referenceLayers.map((layer) =>
      layer.id === id
        ? { ...layer, field: { ...layer.field, ...patch } }
        : layer,
    );
    setReferenceLayers(nextLayers);
    scheduleFullPreview(config, nextLayers);
  };

  const moveReferenceLayer = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= referenceLayers.length) {
      return;
    }

    const nextLayers = [...referenceLayers];
    [nextLayers[index], nextLayers[targetIndex]] = [nextLayers[targetIndex], nextLayers[index]];
    setReferenceLayers(nextLayers);
    scheduleFullPreview(config, nextLayers);
  };

  const removeReferenceLayer = (id: string) => {
    const nextLayers = referenceLayers.filter((layer) => layer.id !== id);
    setReferenceLayers(nextLayers);
    scheduleFullPreview(config, nextLayers);
  };

  const downloadCurrentHeightmap = async () => {
    if (isGenerating || isDownloading) {
      return;
    }

    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch('/api/heightmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          mode: 'heightmap',
          referenceFields: referenceFieldsOf(referenceLayers),
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? `Heightmap export failed with ${response.status}`);
      }

      const blob = await response.blob();
      const seed = response.headers.get('X-Heightmap-Seed') ?? String(config.seed);
      downloadBlob(
        blob,
        `heightmap_${seed}_${config.width}x${config.height}_${config.bitDepth}bit.png`,
      );
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Не удалось скачать heightmap.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="heightmap-shell">
      <header className="topbar">
        <div>
          <h1>World of Hex Heightmap Admin</h1>
          <p>Настройки генерации и предпросмотр результата</p>
        </div>
        <button className="primary-button" disabled={isGenerating} onClick={() => void generatePreview()}>
          Сгенерировать
        </button>
      </header>

      <div className="workspace">
        <section className="controls">
          <Panel title="Запуск">
            <div className="seed-row">
              <label>
                <span>Seed</span>
                <input type="number" value={config.seed} onChange={(event) => setNumber('seed', Number(event.target.value))} />
              </label>
              <button type="button" onClick={randomizeSeed}>Случайный</button>
            </div>

            <div className="two-columns">
              <label>
                <span>Размер</span>
                <select value={config.width} onChange={(event) => setResolution(Number(event.target.value))}>
                  {[1024, 2048, 4096, 8192, 16384].map((size) => (
                    <option key={size} value={size}>{size}x{Math.floor(size / 2)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>PNG</span>
                <select value={config.bitDepth} onChange={(event) => setNumber('bitDepth', Number(event.target.value))}>
                  <option value={8}>8-bit preview</option>
                  <option value={16}>16-bit heightmap</option>
                </select>
              </label>
            </div>

            <div className="preset-grid">
              {presets.map((preset) => (
                <button key={preset.id} type="button" onClick={() => applyPreset(preset)}>{preset.label}</button>
              ))}
            </div>
          </Panel>

          <Panel title="Планета">
            <NumberControlGrid controls={planetControls} config={config} onChange={setNumber} />
          </Panel>

          <Panel title="Секторы">
            <NumberControlGrid controls={sectorProfileControls} config={config} onChange={setNumber} />
          </Panel>

          <Panel title="Гидрология">
            <div className="stage-grid">
              {hydrologyStages.map((stage) => (
                <label className="switch-row" key={stage.key}>
                  <input
                    type="checkbox"
                    checked={config[stage.key]}
                    onChange={(event) => setStage(stage.key, event.target.checked)}
                  />
                  <span>{stage.label}</span>
                </label>
              ))}
            </div>
            <NumberControlGrid controls={hydrologyControls} config={config} onChange={setNumber} />
          </Panel>

          <Panel title="Референсы">
            <div className="reference-heading">
              <p>
                Слои применяются сверху вниз перед гидрологией. Светлые области усиливают выбранный эффект.
              </p>
              <label className="file-button">
                Добавить изображения
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(event) => {
                    void addReferenceFiles(event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>

            {referenceLayers.length === 0 ? (
              <div className="reference-empty">
                Можно загрузить до {maximumReferenceLayers} карт одновременно. Без слоёв seed работает как раньше.
              </div>
            ) : (
              <div className="reference-stack">
                {referenceLayers.map((layer, index) => (
                  <article className="reference-card" key={layer.id}>
                    <img src={layer.previewUrl} alt="" />
                    <div className="reference-card-body">
                      <strong title={layer.name}>{layer.name}</strong>
                      <select
                        aria-label={`Роль ${layer.name}`}
                        value={layer.field.role}
                        onChange={(event) => updateReferenceLayer(layer.id, {
                          role: event.target.value as ReferenceRole,
                        })}
                      >
                        {(Object.keys(referenceRoleLabels) as ReferenceRole[]).map((role) => (
                          <option key={role} value={role}>{referenceRoleLabels[role]}</option>
                        ))}
                      </select>
                      <label className="reference-strength">
                        <span>Влияние {Math.round(layer.field.strength * 100)}%</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={layer.field.strength}
                          onChange={(event) => updateReferenceLayer(layer.id, {
                            strength: Number(event.target.value),
                          })}
                        />
                      </label>
                      <label className="reference-invert">
                        <input
                          type="checkbox"
                          checked={layer.field.inverted}
                          onChange={(event) => updateReferenceLayer(layer.id, {
                            inverted: event.target.checked,
                          })}
                        />
                        Инвертировать
                      </label>
                    </div>
                    <div className="reference-order-actions">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveReferenceLayer(index, -1)}
                        aria-label={`Поднять ${layer.name}`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === referenceLayers.length - 1}
                        onClick={() => moveReferenceLayer(index, 1)}
                        aria-label={`Опустить ${layer.name}`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeReferenceLayer(layer.id)}
                        aria-label={`Удалить ${layer.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Panel>

        </section>

        <section className="preview-panel">
          <div className="preview-header">
            <div>
              <h2>Предпросмотр</h2>
              <p>{status}</p>
            </div>
            <div className="preview-actions">
              <span>{directedSectorCount}/{config.sectorColumns * config.sectorRows} секторов заданы</span>
              <button className="download-link" type="button" disabled={isGenerating || isDownloading} onClick={() => void downloadCurrentHeightmap()}>
                {isDownloading ? 'Готовлю...' : 'Скачать heightmap'}
              </button>
            </div>
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          <div className="sector-planner">
            <div className="sector-planner-header">
              <h2>Секторная режиссура</h2>
              <div className="sector-actions">
                <a
                  className="file-button"
                  href={sectorLayoutDownloadHref}
                  download={`world-of-hex-sector-layout-${config.sectorColumns}x${config.sectorRows}.json`}
                  onClick={() => setLayoutMessage('Раскладка сохранена в JSON.')}
                >
                  Сохранить JSON
                </a>
                <label className="file-button">
                  Загрузить JSON
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => void importSectorLayout(event.target.files?.[0] ?? null)}
                  />
                </label>
                <button type="button" onClick={() => void copySectorLayoutLink()}>Скопировать ссылку</button>
              </div>
            </div>
            <div className="sector-palette" aria-label="Sector brush palette">
              {sectorDirectiveOrder.map((directive) => (
                <button
                  key={directive}
                  className={`sector-palette-button sector-${directive}${sectorBrush === directive ? ' selected' : ''}`}
                  type="button"
                  onClick={() => setSectorBrush(directive)}
                  title={sectorDirectiveLabels[directive]}
                  aria-pressed={sectorBrush === directive}
                >
                  {sectorDirectiveLabels[directive]}
                </button>
              ))}
            </div>
            <div className="sector-size-controls">
              {sectorControls.map((control) => (
                <label key={control.key}>
                  <span>{control.label}</span>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={config[control.key]}
                    onChange={(event) => setNumber(control.key, Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={config[control.key]}
                    onChange={(event) => setNumber(control.key, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
            {layoutMessage ? <p className="sector-layout-message">{layoutMessage}</p> : null}
            <div className="sector-map" style={{ gridTemplateColumns: `repeat(${config.sectorColumns}, minmax(0, 1fr))` }}>
              {normalizeSectorDirectives(config).map((directive, index) => (
                <button
                  key={index}
                  className={`sector-cell sector-${directive}`}
                  type="button"
                  onClick={() => paintSectorDirective(index)}
                  title={sectorDirectiveLabels[directive]}
                >
                  {sectorDirectiveLabels[directive]}
                </button>
              ))}
            </div>
          </div>

          <div className="preview-frame">
            <canvas ref={canvasRef} className="heightmap-preview" aria-label="Heightmap preview" />
            {isGenerating ? <div className="preview-busy">Генерация...</div> : null}
          </div>

          <div className="legend">
            <LegendItem color="#214f82" label="Глубокая вода" />
            <LegendItem color="#4e96b4" label="Мелководье" />
            <LegendItem color="#cabb7f" label="Берег" />
            <LegendItem color="#719a5b" label="Равнины" />
            <LegendItem color="#75694d" label="Холмы" />
            <LegendItem color="#eee" label="Горы / снег" />
          </div>

          <div className="metrics">
            <Metric label="Размер" value={`${config.width}x${config.height}`} />
            <Metric label="Превью" value="Цветная карта" />
            <Metric label="Экспорт" value={`${config.bitDepth}-bit grayscale`} />
            <Metric label="Референсы" value={String(referenceLayers.length)} />
            <Metric label="Порог океана" value={`${Math.round(config.planetSeaLevel * 100)}%`} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: SectionProps) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

interface NumberControlGridProps {
  controls: NumberControl[];
  config: HeightmapConfig;
  onChange: (key: NumericConfigKey, value: number) => void;
}

function NumberControlGrid({ controls, config, onChange }: NumberControlGridProps) {
  return (
    <div className="number-grid">
      {controls.map((control) => (
        <NumberControlField key={control.key} control={control} config={config} onChange={onChange} />
      ))}
    </div>
  );
}

function NumberControlField({ control, config, onChange }: NumberControlFieldProps) {
  const value = config[control.key];
  return (
    <label className="number-control">
      <span>{control.label}</span>
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onChange={(event) => onChange(control.key, Number(event.target.value))}
      />
      <input
        type="number"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onChange={(event) => onChange(control.key, Number(event.target.value))}
      />
    </label>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="legend-item">
      <span style={{ backgroundColor: color }} />
      <strong>{label}</strong>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

function normalizeSectorDirectives(config: HeightmapConfig): SectorDirective[] {
  const size = Math.max(1, Math.floor(config.sectorColumns)) * Math.max(1, Math.floor(config.sectorRows));
  return Array.from({ length: size }, (_, index) => {
    const value = config.sectorDirectives[index];
    return sectorDirectiveOrder.includes(value) ? value : 'free';
  });
}

function resizeSectorGrid(config: HeightmapConfig, sourceColumns = defaultConfig.sectorColumns): HeightmapConfig {
  const columns = Math.max(1, Math.floor(config.sectorColumns));
  const rows = Math.max(1, Math.floor(config.sectorRows));
  const currentColumns = Math.max(1, Math.floor(sourceColumns));
  const oldValues = config.sectorDirectives.length ? config.sectorDirectives : defaultConfig.sectorDirectives;
  const nextValues: SectorDirective[] = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const sourceX = Math.min(currentColumns - 1, x);
      const sourceY = Math.min(Math.floor(oldValues.length / currentColumns) - 1, y);
      nextValues.push(oldValues[sourceY * currentColumns + sourceX] ?? 'free');
    }
  }

  return {
    ...config,
    sectorColumns: columns,
    sectorRows: rows,
    sectorDirectives: nextValues,
  };
}

function createSectorLayout(config: HeightmapConfig): SectorLayout {
  return {
    version: 1,
    sectorColumns: config.sectorColumns,
    sectorRows: config.sectorRows,
    sectorDirectives: normalizeSectorDirectives(config),
  };
}

function createPreviewConfig(config: HeightmapConfig): HeightmapConfig {
  if (config.width <= maxPreviewWidth) {
    return config;
  }

  return {
    ...config,
    width: maxPreviewWidth,
    height: Math.floor(maxPreviewWidth / 2),
  };
}

function readStoredHeightmapState(): StoredHeightmapState | null {
  const rawState = window.localStorage.getItem(storedStateKey);
  if (!rawState) {
    return null;
  }

  const parsed = JSON.parse(rawState) as Partial<StoredHeightmapState>;
  if (parsed.version !== storedStateVersion || !parsed.config || typeof parsed.config !== 'object') {
    return null;
  }

  return {
    version: storedStateVersion,
    config: parsed.config,
    sectorBrush: parsed.sectorBrush,
  };
}

function writeStoredHeightmapState(state: StoredHeightmapState) {
  window.localStorage.setItem(storedStateKey, JSON.stringify(state));
}

function normalizeStoredConfig(config: Partial<HeightmapConfig>): HeightmapConfig {
  const mergedConfig = {
    ...defaultConfig,
    ...config,
    sectorDirectives: Array.isArray(config.sectorDirectives)
      ? config.sectorDirectives.filter((directive) => sectorDirectiveOrder.includes(directive))
      : defaultConfig.sectorDirectives,
  };

  return resizeSectorGrid(mergedConfig, Number(config.sectorColumns) || defaultConfig.sectorColumns);
}

async function createReferenceLayer(file: File): Promise<ReferenceLayer> {
  const image = await loadFileImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = referenceFieldWidth;
  canvas.height = referenceFieldHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error(`Не удалось обработать ${file.name}.`);
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const values = new Uint8Array(canvas.width * canvas.height);
  for (let index = 0; index < values.length; index += 1) {
    const pixelIndex = index * 4;
    values[index] = Math.round(
      pixels[pixelIndex] * 0.2126 +
      pixels[pixelIndex + 1] * 0.7152 +
      pixels[pixelIndex + 2] * 0.0722,
    );
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    previewUrl: canvas.toDataURL('image/jpeg', 0.78),
    field: {
      role: 'relief',
      strength: 0.5,
      inverted: false,
      width: canvas.width,
      height: canvas.height,
      values: bytesToBase64(values),
    },
  };
}

function loadFileImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Не удалось прочитать изображение ${file.name}.`));
    };
    image.src = url;
  });
}

function bytesToBase64(values: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let offset = 0; offset < values.length; offset += chunkSize) {
    const end = Math.min(values.length, offset + chunkSize);
    let chunk = '';
    for (let index = offset; index < end; index += 1) {
      chunk += String.fromCharCode(values[index]);
    }
    chunks.push(chunk);
  }
  return btoa(chunks.join(''));
}

function referenceFieldsOf(layers: ReferenceLayer[]): ReferenceFieldPayload[] {
  return layers.map((layer) => layer.field);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function loadBlobImage(blob: Blob): Promise<CanvasImageSource> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось загрузить preview tile.'));
    };
    image.src = url;
  });
}

function sectorDirtyRegion(config: HeightmapConfig, index: number): PreviewRegion {
  const previewConfig = createPreviewConfig(config);
  const columns = Math.max(1, Math.floor(config.sectorColumns));
  const rows = Math.max(1, Math.floor(config.sectorRows));
  const sectorX = index % columns;
  const sectorY = Math.floor(index / columns);
  const margin = 3;

  if (sectorX - margin < 0 || sectorX + margin >= columns) {
    return {
      x: 0,
      y: 0,
      width: previewConfig.width,
      height: previewConfig.height,
    };
  }

  const minSectorX = Math.max(0, sectorX - margin);
  const maxSectorX = Math.min(columns, sectorX + margin + 1);
  const minSectorY = Math.max(0, sectorY - margin);
  const maxSectorY = Math.min(rows, sectorY + margin + 1);
  const x = Math.floor((minSectorX / columns) * previewConfig.width);
  const y = Math.floor((minSectorY / rows) * previewConfig.height);
  const maxX = Math.ceil((maxSectorX / columns) * previewConfig.width);
  const maxY = Math.ceil((maxSectorY / rows) * previewConfig.height);

  return {
    x,
    y,
    width: Math.max(1, maxX - x),
    height: Math.max(1, maxY - y),
  };
}

function parseSectorLayout(text: string): SectorLayout {
  const parsed = JSON.parse(text) as Partial<SectorLayout>;
  const sectorColumns = Number(parsed.sectorColumns);
  const sectorRows = Number(parsed.sectorRows);
  const sourceDirectives = Array.isArray(parsed.sectorDirectives)
    ? parsed.sectorDirectives
    : [];

  if (!Number.isFinite(sectorColumns) || !Number.isFinite(sectorRows)) {
    throw new Error('В файле нет размеров секторной сетки.');
  }

  const sectorDirectives = sourceDirectives.map((directive) => (
    sectorDirectiveOrder.includes(directive) ? directive : 'free'
  ));

  return {
    version: 1,
    sectorColumns: Math.max(1, Math.floor(sectorColumns)),
    sectorRows: Math.max(1, Math.floor(sectorRows)),
    sectorDirectives,
  };
}

function encodeSectorLayout(layout: SectorLayout): string {
  return btoa(encodeURIComponent(JSON.stringify(layout)));
}

function createSectorLayoutDataUrl(layout: SectorLayout): string {
  return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(layout, null, 2))}`;
}
