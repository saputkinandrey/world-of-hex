import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { createInterface } from 'node:readline';
import mongoose from 'mongoose';
import {
  TradeEffectKey,
  TradeEffectKeySchema,
  TRADE_EFFECT_CATEGORIES,
  type TradeEffectCategoryName,
} from '../../src/rps/schemas/trade-effect-key.schema';
import {
  TradeEffectCategory,
  TradeEffectCategorySchema,
} from '../../src/rps/schemas/trade-effect-category.schema';

type RowKeysByCategory = {
  tradeEffect_key: string;
  category: string;
  occurrences?: string | number;
};

type RowCategorySummary = {
  category: string;
  unique_keys: string | number;
  total_occurrences?: string | number;
};

const DATA_DIR = path.resolve(__dirname, '..', 'data', 'trade-effects');
const KEYS_FILE = path.join(DATA_DIR, 'trade_effect_keys_by_category.csv');
const SUMMARY_FILE = path.join(DATA_DIR, 'trade_effect_categories_summary.csv');

const TradeEffectKeyModel =
  mongoose.models[TradeEffectKey.name] ??
  mongoose.model(TradeEffectKey.name, TradeEffectKeySchema);

const TradeEffectCategoryModel =
  mongoose.models[TradeEffectCategory.name] ??
  mongoose.model(TradeEffectCategory.name, TradeEffectCategorySchema);

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const RECOMPUTE = args.has('--recompute-category-occurrences');

function parseCsvLine(line: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

async function readCsv<T = any>(file: string, label: string): Promise<T[]> {
  if (!fs.existsSync(file)) {
    console.warn(
      `CSV "${label}" was not found at ${file}. Continuing with 0 rows.`
    );
    return [];
  }
  const stream = fs.createReadStream(file, { encoding: 'utf-8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  const rows: T[] = [];
  let header: string[] | null = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!header) {
      header = parseCsvLine(line);
      continue;
    }
    const cols = parseCsvLine(line);
    const obj: any = {};
    header.forEach((h, idx) => {
      obj[h] = cols[idx];
    });
    rows.push(obj);
  }
  return rows;
}

function toInt(v: unknown, def = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function normCategory(name: string): TradeEffectCategoryName | string {
  return name?.trim();
}

function assertCategory(name: string): asserts name is TradeEffectCategoryName {
  if (!TRADE_EFFECT_CATEGORIES.includes(name as TradeEffectCategoryName)) {
    throw new Error(`Unknown category: "${name}"`);
  }
}

async function upsertKeys(rows: RowKeysByCategory[]) {
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    const key = String(r.tradeEffect_key ?? '').trim();
    const rawCat = normCategory(String(r.category ?? ''));
    const occ = toInt(r.occurrences ?? 0);

    if (!key || !rawCat) {
      fail++;
      continue;
    }

    try {
      assertCategory(rawCat);
    } catch (err) {
      console.warn(`Skipping key "${key}": ${(err as Error).message}`);
      fail++;
      continue;
    }

    if (DRY_RUN) {
      ok++;
      continue;
    }

    await TradeEffectKeyModel.updateOne(
      { key },
      { $set: { key, category: rawCat, occurrences: occ } },
      { upsert: true }
    );
    ok++;
  }
  return { ok, fail };
}

async function upsertCategories(rows: RowCategorySummary[]) {
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    const rawCat = normCategory(String(r.category ?? ''));
    const uniqueKeys = toInt(r.unique_keys ?? 0);
    const totalOccurrences =
      r.total_occurrences != null ? toInt(r.total_occurrences) : undefined;

    if (!rawCat) {
      fail++;
      continue;
    }

    try {
      assertCategory(rawCat);
    } catch (err) {
      console.warn(`Skipping category row "${rawCat}": ${(err as Error).message}`);
      fail++;
      continue;
    }

    if (DRY_RUN) {
      ok++;
      continue;
    }

    const $set: Record<string, unknown> = { name: rawCat, uniqueKeys };
    if (typeof totalOccurrences === 'number') {
      $set.totalOccurrences = totalOccurrences;
    }

    await TradeEffectCategoryModel.updateOne(
      { name: rawCat },
      { $set },
      { upsert: true }
    );
    ok++;
  }
  return { ok, fail };
}

async function recomputeCategoryTotalsFromKeys() {
  const agg = await TradeEffectKeyModel.aggregate([
    {
      $group: {
        _id: '$category',
        total: { $sum: { $ifNull: ['$occurrences', 0] } },
      },
    },
  ]);

  for (const row of agg) {
    const name = row._id as string;
    const total = row.total as number;

    await TradeEffectCategoryModel.updateOne(
      { name },
      { $set: { totalOccurrences: total } },
      { upsert: false }
    );
  }
  return agg.length;
}

async function connectIfNeeded() {
  if (DRY_RUN && !RECOMPUTE) {
    console.log('Dry run detected; skipping MongoDB connection.');
    return false;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(uri);
  return true;
}

async function disconnectIfNeeded(connected: boolean) {
  if (connected) {
    await mongoose.disconnect();
  }
}

async function main() {
  if (DRY_RUN && RECOMPUTE) {
    console.warn('Recompute flag is ignored during dry-run.');
  }

  const connected = await connectIfNeeded();

  const keyRows = await readCsv<RowKeysByCategory>(
    KEYS_FILE,
    'trade_effect_keys_by_category.csv'
  );
  const catRows = await readCsv<RowCategorySummary>(
    SUMMARY_FILE,
    'trade_effect_categories_summary.csv'
  );

  console.log(`Loaded CSV rows: keys=${keyRows.length}, categories=${catRows.length}`);

  const kRes = await upsertKeys(keyRows);
  console.log(`Keys upsert: ok=${kRes.ok}, fail=${kRes.fail}`);

  const cRes = await upsertCategories(catRows);
  console.log(`Categories upsert: ok=${cRes.ok}, fail=${cRes.fail}`);

  if (RECOMPUTE && !DRY_RUN) {
    const affected = await recomputeCategoryTotalsFromKeys();
    console.log(`Recomputed totalOccurrences from keys for ${affected} categories`);
  }

  await disconnectIfNeeded(connected);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
