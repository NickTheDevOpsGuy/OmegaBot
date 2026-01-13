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

  /**
   * Canonical breakdown key.
   * (We'll also accept legacy "breakdownByUser" on disk)
   */
  byUserByCommand: Record<string, Record<FunCommandKey, number>>;

  /**
   * Back-compat alias kept in-memory so older code can still read it.
   * Do not write this separately; it mirrors byUserByCommand.
   */
  breakdownByUser: Record<string, Record<FunCommandKey, number>>;
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
  return Object.fromEntries(ALL_COMMANDS.map((k) => [k, 0])) as Record<
    FunCommandKey,
    number
  >;
}

function emptyStore(): FunUsageStoreV1 {
  const now = new Date().toISOString();
  const byUserByCommand: Record<string, Record<FunCommandKey, number>> = {};

  return {
    version: 1,
    initializedAt: now,
    updatedAt: now,
    totalsByUser: {},
    totalsByCommand: emptyTotalsByCommand(),
    byUserByCommand,
    breakdownByUser: byUserByCommand, // alias
  };
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeTotalsByUser(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const out: Record<string, number> = {};

  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}

function normalizeTotalsByCommand(raw: unknown): Record<FunCommandKey, number> {
  const base = emptyTotalsByCommand();
  if (!isRecord(raw)) return base;

  for (const k of ALL_COMMANDS) {
    const v = raw[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) base[k] = v;
  }
  return base;
}

function normalizeByUserByCommand(
  raw: unknown,
): Record<string, Record<FunCommandKey, number>> {
  if (!isRecord(raw)) return {};

  const out: Record<string, Record<FunCommandKey, number>> = {};

  for (const [userId, perCmd] of Object.entries(raw)) {
    if (!isRecord(perCmd)) continue;

    const normalized: Record<FunCommandKey, number> = {} as Record<FunCommandKey, number>;

    for (const cmd of ALL_COMMANDS) {
      const v = perCmd[cmd];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        normalized[cmd] = v;
      }
    }

    // Only store if it has at least one entry
    if (Object.keys(normalized).length > 0) {
      out[userId] = normalized;
    }
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

    const totalsByUser = normalizeTotalsByUser(parsed.totalsByUser);
    const totalsByCommand = normalizeTotalsByCommand(parsed.totalsByCommand);

    /**
     * ✅ Back-compat: accept either key from disk
     * - preferred: byUserByCommand
     * - legacy: breakdownByUser
     */
    const byUserByCommand = normalizeByUserByCommand(
      parsed.byUserByCommand ?? parsed.breakdownByUser,
    );

    const initializedAt =
      typeof parsed.initializedAt === "string" ? parsed.initializedAt : base.initializedAt;

    const updatedAt =
      typeof parsed.updatedAt === "string" ? parsed.updatedAt : base.updatedAt;

    return {
      version: 1,
      initializedAt,
      updatedAt,
      totalsByUser,
      totalsByCommand,

      // Canonical + alias
      byUserByCommand,
      breakdownByUser: byUserByCommand,
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: FunUsageStoreV1): Promise<void> {
  await ensureDataDir();

  // Write ONLY the canonical breakdown key to disk
  const toWrite = {
    version: store.version,
    initializedAt: store.initializedAt,
    updatedAt: store.updatedAt,
    totalsByUser: store.totalsByUser,
    totalsByCommand: store.totalsByCommand,
    byUserByCommand: store.byUserByCommand,
  };

  await fs.writeFile(STORE_PATH, JSON.stringify(toWrite, null, 2), "utf8");
}

export async function recordFunUsage(args: {
  userId: string;
  command: FunCommandKey;
}): Promise<void> {
  const { userId, command } = args;

  const store = await loadStore();

  // totalsByUser
  store.totalsByUser[userId] = (store.totalsByUser[userId] ?? 0) + 1;

  // totalsByCommand
  store.totalsByCommand[command] = (store.totalsByCommand[command] ?? 0) + 1;

  // byUserByCommand (canonical)
  const userMap: Record<FunCommandKey, number> =
    store.byUserByCommand[userId] ?? ({} as Record<FunCommandKey, number>);

  userMap[command] = (userMap[command] ?? 0) + 1;
  store.byUserByCommand[userId] = userMap;

  // keep alias in sync
  store.breakdownByUser = store.byUserByCommand;

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