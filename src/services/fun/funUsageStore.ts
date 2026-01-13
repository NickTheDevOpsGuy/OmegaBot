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

function emptyStore(): FunUsageStoreV1 {
  const totalsByCommand = Object.fromEntries(
    ALL_COMMANDS.map((k) => [k, 0]),
  ) as Record<FunCommandKey, number>;

  const now = new Date().toISOString();

  return {
    version: 1,
    initializedAt: now,
    updatedAt: now,
    totalsByUser: {},
    totalsByCommand,
    breakdownByUser: {},
  };
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadStore(): Promise<FunUsageStoreV1> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<FunUsageStoreV1> | null;

    if (!parsed || typeof parsed !== "object") return emptyStore();
    if (parsed.version !== 1) return emptyStore();

    // Start from a known-good shape and merge in what exists
    const base = emptyStore();

    const totalsByUser =
      parsed.totalsByUser && typeof parsed.totalsByUser === "object"
        ? parsed.totalsByUser
        : {};

    const breakdownByUser =
      parsed.breakdownByUser && typeof parsed.breakdownByUser === "object"
        ? parsed.breakdownByUser
        : {};

    const totalsByCommandRaw =
      parsed.totalsByCommand && typeof parsed.totalsByCommand === "object"
        ? parsed.totalsByCommand
        : {};

    const totalsByCommand = { ...base.totalsByCommand };
    for (const k of ALL_COMMANDS) {
      const v = (totalsByCommandRaw as Record<string, unknown>)[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        totalsByCommand[k] = v;
      }
    }

    return {
      ...base,
      initializedAt:
        typeof parsed.initializedAt === "string" ? parsed.initializedAt : base.initializedAt,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : base.updatedAt,
      totalsByUser,
      totalsByCommand,
      breakdownByUser,
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

  // totalsByUser
  store.totalsByUser[userId] = (store.totalsByUser[userId] ?? 0) + 1;

  // totalsByCommand
  store.totalsByCommand[command] = (store.totalsByCommand[command] ?? 0) + 1;

  // breakdownByUser
  const userBreakdown: Record<FunCommandKey, number> =
    (store.breakdownByUser[userId] as Record<FunCommandKey, number> | undefined) ?? ({} as Record<
      FunCommandKey,
      number
    >);

  userBreakdown[command] = (userBreakdown[command] ?? 0) + 1;
  store.breakdownByUser[userId] = userBreakdown;

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