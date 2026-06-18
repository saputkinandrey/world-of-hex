import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

interface SaveConfigRequest {
  config: unknown;
  filePath?: unknown;
}

interface ConfigFileResponse {
  config: unknown;
  filePath: string;
}

interface ConfigFileErrorResponse {
  error: string;
}

const workspaceRoot = path.resolve(process.cwd(), '..');
const defaultConfigFilePath = 'economy-admin/config/default-economy-admin-config.json';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const resolveConfigFilePath = (requestedPath: unknown): string => {
  const rawPath = typeof requestedPath === 'string' && requestedPath.trim() ? requestedPath.trim() : defaultConfigFilePath;
  const resolvedPath = path.isAbsolute(rawPath) ? path.resolve(rawPath) : path.resolve(workspaceRoot, rawPath);
  const relativePath = path.relative(workspaceRoot, resolvedPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Config file path must stay inside the workspace');
  }
  return resolvedPath;
};

const toWorkspacePath = (filePath: string): string => {
  return path.relative(workspaceRoot, filePath).replaceAll(path.sep, '/');
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = async (request: NextRequest): Promise<NextResponse<ConfigFileResponse | ConfigFileErrorResponse>> => {
  try {
    const filePath = resolveConfigFilePath(request.nextUrl.searchParams.get('filePath'));
    const rawConfig = await readFile(filePath, 'utf8');
    return NextResponse.json({ config: JSON.parse(rawConfig), filePath: toWorkspacePath(filePath) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read config file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const PUT = async (request: NextRequest): Promise<NextResponse<ConfigFileResponse | ConfigFileErrorResponse>> => {
  try {
    const body = (await request.json()) as SaveConfigRequest;
    if (!isRecord(body.config)) {
      return NextResponse.json({ error: 'Request body must include config object' }, { status: 400 });
    }
    const filePath = resolveConfigFilePath(body.filePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(body.config, null, 2)}\n`, 'utf8');
    return NextResponse.json({ config: body.config, filePath: toWorkspacePath(filePath) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to write config file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
