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
  updatedAt: string;
  totalsByUser: Record<string, number>;
  totalsByCommand: Record<FunCommandKey, number>;
  breakdownByUser: Record<string, Partial<Record<FunCommandKey, number>>>;
};

export type FunUsageSnapshot = {
  updatedAt: string;
  totalsByUser: Array<{ userId: string; total: number }>;
  totalsByCommand: Array<{ command: FunCommandKey; total: number }>;
  breakdownByUser: Record<string, Partial<Record<FunCommandKey, number>>>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "fun-usage.json");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function emptyStore(): FunUsageStoreV1 {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalsByUser: {},
    totalsByCommand: {
      chucknorris: 0,
      dadjoke: 0,
      dice: 0,
      coinflip: 0,
      java: 0,
      poll: 0,
      weather: 0,
      weather7: 0,
      leaderboard: 0,
    },
    breakdownByUser: {},
  };
}

async function loadStore(): Promise<FunUsageStoreV1> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as FunUsageStoreV1;

    if (!parsed || typeof parsed !== "object") return emptyStore();
    if (parsed.version !== 1) return emptyStore();
    if (!parsed.totalsByUser || typeof parsed.totalsByUser !== "object") return emptyStore();
    if (
      !parsed.totalsByCommand ||
      typeof parsed.totalsByCommand !== "object"
    )
      return emptyStore();
    if (
      !parsed.breakdownByUser ||
      typeof parsed.breakdownByUser !== "object"
    )
      return emptyStore();

    return parsed;
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

  try {
    const store = await loadStore();

    store.totalsByUser[userId] = (store.totalsByUser[userId] ?? 0) + 1;
    store.totalsByCommand[command] = (store.totalsByCommand[command] ?? 0) + 1;

    const currentBreakdown = store.breakdownByUser[userId] ?? {};
    currentBreakdown[command] = (currentBreakdown[command] ?? 0) + 1;
    store.breakdownByUser[userId] = currentBreakdown;

    store.updatedAt = new Date().toISOString();

    await saveStore(store);
  } catch (err) {
    logger.warn({ err, userId, command }, "[funUsageStore] failed to record usage");
  }
}

export async function getFunUsageSnapshot(): Promise<FunUsageSnapshot> {
  const store = await loadStore();

  const totalsByUser = Object.entries(store.totalsByUser)
    .map(([userId, total]) => ({ userId, total }))
    .sort((a, b) => b.total - a.total);

  const totalsByCommand = (Object.entries(store.totalsByCommand) as Array<
    [FunCommandKey, number]
  >)
    .map(([command, total]) => ({ command, total }))
    .sort((a, b) => b.total - a.total);

  return {
    updatedAt: store.updatedAt,
    totalsByUser,
    totalsByCommand,
    breakdownByUser: store.breakdownByUser,
  };
}