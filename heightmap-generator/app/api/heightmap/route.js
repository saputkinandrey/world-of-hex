import { NextResponse } from 'next/server';
import { DEFAULT_CONFIG, normalizeConfig } from '../../../src/config.mjs';
import { generateHeightmap, generateHeightmapRegion } from '../../../src/generator.mjs';
import { encodeLandHeightmapPng, encodeTerrainPreviewPng } from '../../../src/png.mjs';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const config = normalizeConfig({
      ...DEFAULT_CONFIG,
      ...body.config,
    });
    const seed =
      config.seed === -1 ? Math.floor(Math.random() * 0xffffffff) : config.seed;
    const mode = body.mode === 'heightmap' ? 'heightmap' : 'preview';
    const region = normalizeRegion(config, body.region);
    const grid = region && mode === 'preview'
      ? generateHeightmapRegion(config, seed >>> 0, region)
      : generateHeightmap(config, seed >>> 0);
    const png =
      mode === 'heightmap'
        ? encodeLandHeightmapPng(grid, config.bitDepth, { seaLevel: 0.5 })
        : encodeTerrainPreviewPng(grid, { seaLevel: 0.5 });

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${mode}_${seed}_${config.bitDepth}bit.png"`,
        'X-Heightmap-Seed': String(seed >>> 0),
        'X-Heightmap-Mode': mode,
        ...(region
          ? {
              'X-Heightmap-Region-X': String(region.x),
              'X-Heightmap-Region-Y': String(region.y),
              'X-Heightmap-Region-Width': String(region.width),
              'X-Heightmap-Region-Height': String(region.height),
            }
          : {}),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Heightmap generation failed.',
      },
      { status: 400 },
    );
  }
}

function normalizeRegion(config, region) {
  if (!region || typeof region !== 'object') {
    return null;
  }

  const x = Math.max(0, Math.min(config.width - 1, Math.floor(Number(region.x) || 0)));
  const y = Math.max(0, Math.min(config.height - 1, Math.floor(Number(region.y) || 0)));
  const width = Math.max(1, Math.min(config.width - x, Math.floor(Number(region.width) || config.width)));
  const height = Math.max(1, Math.min(config.height - y, Math.floor(Number(region.height) || config.height)));
  return { x, y, width, height };
}
