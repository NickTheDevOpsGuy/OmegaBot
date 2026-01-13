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

export type FunUsageUserStats = {
  total: number;
  commands: Partial<Record<FunCommandKey, number>>;
  updatedAt: string;
};

export type FunUsageStore = {
  version: 1;
  updatedAt: string;
  totals: Partial<Record<FunCommandKey, number>>;
  users: Record<string, FunUsageUserStats>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "fun-usage.json");

function nowIso(): string {
  return new Date().toISOString();
}

function emptyStore(): FunUsageStore {
  return {
    version: 1,
    updatedAt: nowIso(),
    totals: {},
    users: {},
  };
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readStore(): Promise<FunUsageStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as FunUsageStore;

    // Minimal validation + forward-safe defaults
    if (!parsed || parsed.version !== 1) return emptyStore();
    if (!parsed.totals) parsed.totals = {};
    if (!parsed.users) parsed.users = {};
    if (!parsed.updatedAt) parsed.updatedAt = nowIso();

    return parsed;
  } catch (err) {
    // First run or file missing is fine
    return emptyStore();
  }
}

async function writeStore(store: FunUsageStore): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function recordFunUsage(args: {
  userId: string;
  command: FunCommandKey;
}): Promise<void> {
  const { userId, command } = args;

  try {
    const store = await readStore();

    // Totals
    const prevTotal = store.totals[command] ?? 0;
    store.totals[command] = prevTotal + 1;

    // User stats
    const user = store.users[userId] ?? {
      total: 0,
      commands: {},
      updatedAt: nowIso(),
    };

    user.total += 1;
    const prevCmd = user.commands[command] ?? 0;
    user.commands[command] = prevCmd + 1;
    user.updatedAt = nowIso();

    store.users[userId] = user;
    store.updatedAt = nowIso();

    await writeStore(store);
  } catch (err) {
    // Do not crash commands if stats storage fails
    logger.warn({ err }, "[funUsageStore] recordFunUsage failed");
  }
}

export async function getFunUsageSnapshot(): Promise<FunUsageStore> {
  return await readStore();
}