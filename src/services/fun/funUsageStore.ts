// src/services/fun/funUsageStore.ts

import { promises as fs } from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";

export type FunCommandKey =
  | "chucknorris"
  | "dadjoke"
  | "dice"
  | "coinflip"
  | "java"
  | "poll"
  | "weather"
  | "weather7"
  | "leaderboard";

type Breakdown = Record<FunCommandKey, number>;

type FunUsageStoreV1 = {
  version: 1;
  initializedAt: string;
  updatedAt: string;

  totalsByUser: Record<string, number>;
  totalsByCommand: Record<FunCommandKey, number>;

  // Canonical field name going forward
  breakdownByUser: Record<string, Breakdown>;

  // Back-compat only (older shape some dev builds used)
  byUserByCommand?: Record<string, Partial<Breakdown>>;
};

export type FunUsageSnapshot = FunUsageStoreV1;

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "fun-usage.json");

const ALL_COMMANDS: FunCommandKey[] = [
  "chucknorris",
  "dadjoke",
  "dice",
  "coinflip",
  "java",
  "poll",
  "weather",
  "weather7",
  "leaderboard",
];

function emptyTotalsByCommand(): Record<FunCommandKey, number> {
  return Object.fromEntries(ALL_COMMANDS.map((k) => [k, 0])) as Record<FunCommandKey, number>;
}

function emptyBreakdown(): Breakdown {
  return Object.fromEntries(ALL_COMMANDS.map((k) => [k, 0])) as Breakdown;
}

function emptyStore(): FunUsageStoreV1 {
  const now = new Date().toISOString();
  return {
    version: 1,
    initializedAt: now,
    updatedAt: now,
    totalsByUser: {},
    totalsByCommand: emptyTotalsByCommand(),
    breakdownByUser: {},
  };
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceNonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < 0) return null;
  return value;
}

function coerceBreakdown(value: unknown): Breakdown | null {
  if (!isRecord(value)) return null;

  const out = emptyBreakdown();
  for (const k of ALL_COMMANDS) {
    const n = coerceNonNegativeInt(value[k]);
    if (n !== null) out[k] = n;
  }
  return out;
}

async function loadStore(): Promise<FunUsageStoreV1> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) return emptyStore();
    if (parsed.version !== 1) return emptyStore();

    const base = emptyStore();

    const totalsByUser = isRecord(parsed.totalsByUser)
      ? (parsed.totalsByUser as Record<string, number>)
      : {};

    const totalsByCommandRaw = isRecord(parsed.totalsByCommand)
      ? (parsed.totalsByCommand as Record<string, unknown>)
      : {};

    const totalsByCommand = { ...base.totalsByCommand };
    for (const k of ALL_COMMANDS) {
      const n = coerceNonNegativeInt(totalsByCommandRaw[k]);
      if (n !== null) totalsByCommand[k] = n;
    }

    // Canonical new field
    const breakdownByUserRaw = isRecord(parsed.breakdownByUser)
      ? (parsed.breakdownByUser as Record<string, unknown>)
      : {};

    // Back-compat field (your current JSON)
    const byUserByCommandRaw = isRecord(parsed.byUserByCommand)
      ? (parsed.byUserByCommand as Record<string, unknown>)
      : {};

    // Merge: breakdownByUser wins, else fallback to byUserByCommand
    const breakdownByUser: Record<string, Breakdown> = {};

    const userIds = new Set<string>([
      ...Object.keys(breakdownByUserRaw),
      ...Object.keys(byUserByCommandRaw),
      ...Object.keys(totalsByUser),
    ]);

    for (const userId of userIds) {
      const fromNew = coerceBreakdown(breakdownByUserRaw[userId]);
      const fromOld = coerceBreakdown(byUserByCommandRaw[userId]);
      const chosen = fromNew ?? fromOld;

      if (chosen) breakdownByUser[userId] = chosen;
    }

    return {
      ...base,
      initializedAt: typeof parsed.initializedAt === "string" ? parsed.initializedAt : base.initializedAt,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : base.updatedAt,
      totalsByUser,
      totalsByCommand,
      breakdownByUser,
      // keep the optional field if it existed, but we won't write it anymore
      byUserByCommand: isRecord(parsed.byUserByCommand)
        ? (parsed.byUserByCommand as Record<string, Partial<Breakdown>>)
        : undefined,
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: FunUsageStoreV1): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function recordFunUsage(args: { userId: string; command: FunCommandKey }): Promise<void> {
  const { userId, command } = args;

  const store = await loadStore();

  store.totalsByUser[userId] = (store.totalsByUser[userId] ?? 0) + 1;
  store.totalsByCommand[command] = (store.totalsByCommand[command] ?? 0) + 1;

  const current = store.breakdownByUser[userId] ?? emptyBreakdown();
  current[command] = (current[command] ?? 0) + 1;
  store.breakdownByUser[userId] = current;

  store.updatedAt = new Date().toISOString();

  try {
    await saveStore(store);
  } catch (err) {
    logger.error({ err }, "[fun/usage] failed to save fun usage store");
  }
}

export async function getFunUsageSnapshot(): Promise<FunUsageSnapshot> {
  return loadStore();
}