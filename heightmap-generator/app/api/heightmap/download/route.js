import { NextResponse } from 'next/server';
import { DEFAULT_CONFIG, normalizeConfig } from '../../../../src/config.mjs';
import { generateHeightmap } from '../../../../src/generator.mjs';
import { encodeLandHeightmapPng } from '../../../../src/png.mjs';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const rawConfig = formData.get('config');
    if (typeof rawConfig !== 'string') {
      throw new Error('Missing heightmap config.');
    }

    const bodyConfig = JSON.parse(rawConfig);
    const config = normalizeConfig({
      ...DEFAULT_CONFIG,
      ...bodyConfig,
    });
    const seed =
      config.seed === -1 ? Math.floor(Math.random() * 0xffffffff) : config.seed;
    const grid = generateHeightmap(config, seed >>> 0);
    const png = encodeLandHeightmapPng(grid, config.bitDepth, { seaLevel: 0.5 });
    const filename = `heightmap_${seed}_${config.width}x${config.height}_${config.bitDepth}bit.png`;

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Heightmap-Seed': String(seed >>> 0),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Heightmap download failed.',
      },
      { status: 400 },
    );
  }
}
