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

type FunUsageStoreV1 = {
  version: 1;
  initializedAt: string;
  updatedAt: string;

  totalsByUser: Record<string, number>;
  totalsByCommand: Record<FunCommandKey, number>;

  // This is the canonical per-user breakdown (matches your JSON)
  byUserByCommand: Record<string, Record<FunCommandKey, number>>;

  // Backward-compat: older name some code used
  breakdownByUser?: Record<string, Record<FunCommandKey, number>>;
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

function nowIso(): string {
  return new Date().toISOString();
}

function emptyTotalsByCommand(): Record<FunCommandKey, number> {
  return Object.fromEntries(ALL_COMMANDS.map((k) => [k, 0])) as Record<
    FunCommandKey,
    number
  >;
}

function emptyStore(): FunUsageStoreV1 {
  const now = nowIso();
  return {
    version: 1,
    initializedAt: now,
    updatedAt: now,
    totalsByUser: {},
    totalsByCommand: emptyTotalsByCommand(),
    byUserByCommand: {},
  };
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function sanitizeTotalsByUser(input: unknown): Record<string, number> {
  if (!isRecord(input)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}

function sanitizeTotalsByCommand(input: unknown): Record<FunCommandKey, number> {
  const base = emptyTotalsByCommand();
  if (!isRecord(input)) return base;

  for (const key of ALL_COMMANDS) {
    const v = input[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) base[key] = v;
  }

  return base;
}

function sanitizeByUserByCommand(
  input: unknown,
): Record<string, Record<FunCommandKey, number>> {
  if (!isRecord(input)) return {};
  const out: Record<string, Record<FunCommandKey, number>> = {};

  for (const [userId, rawBreakdown] of Object.entries(input)) {
    if (!isRecord(rawBreakdown)) continue;

    const breakdown: Record<FunCommandKey, number> = emptyTotalsByCommand();
    let any = false;

    for (const cmd of ALL_COMMANDS) {
      const v = rawBreakdown[cmd];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        breakdown[cmd] = v;
        any = true;
      }
    }

    if (any) out[userId] = breakdown;
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

    const initializedAt =
      typeof parsed.initializedAt === "string"
        ? parsed.initializedAt
        : base.initializedAt;
    const updatedAt =
      typeof parsed.updatedAt === "string" ? parsed.updatedAt : base.updatedAt;

    const totalsByUser = sanitizeTotalsByUser(parsed.totalsByUser);
    const totalsByCommand = sanitizeTotalsByCommand(parsed.totalsByCommand);

    // Prefer canonical name
    const byUserByCommand = sanitizeByUserByCommand(parsed.byUserByCommand);

    // Backward-compat: if file has breakdownByUser but not byUserByCommand
    const legacyBreakdown = sanitizeByUserByCommand(parsed.breakdownByUser);
    const finalByUserByCommand =
      Object.keys(byUserByCommand).length > 0 ? byUserByCommand : legacyBreakdown;

    return {
      ...base,
      initializedAt,
      updatedAt,
      totalsByUser,
      totalsByCommand,
      byUserByCommand: finalByUserByCommand,
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: FunUsageStoreV1): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function recordFunUsage(args: {
  userId: string;
  command: FunCommandKey;
}): Promise<void> {
  const { userId, command } = args;

  const store = await loadStore();

  store.totalsByUser[userId] = (store.totalsByUser[userId] ?? 0) + 1;
  store.totalsByCommand[command] = (store.totalsByCommand[command] ?? 0) + 1;

  const existing = store.byUserByCommand[userId] ?? emptyTotalsByCommand();
  existing[command] = (existing[command] ?? 0) + 1;
  store.byUserByCommand[userId] = existing;

  store.updatedAt = nowIso();

  try {
    await saveStore(store);
  } catch (err) {
    logger.error({ err }, "[fun/usage] failed to save fun usage store");
  }
}

export async function getFunUsageSnapshot(): Promise<FunUsageSnapshot> {
  return loadStore();
}
