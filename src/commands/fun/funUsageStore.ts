// src/services/fun/funUsageStore.ts

import { promises as fs } from "node:fs";
import path from "node:path";

export type FunCommandKey =
  | "chucknorris"
  | "dadjoke"
  | "dice"
  | "weather"
  | "weather7"
  | "coinflip"
  | "poll"
  | "java"
  | "leaderboard";

export type FunUsageSnapshot = {
  updatedAt: string;
  totalsByCommand: Record<string, number>;
  totalsByUser: Record<string, number>;
  byUserByCommand: Record<string, Record<string, number>>;
};

type FunUsageFile = {
  version: 1;
  updatedAt: string;
  totalsByCommand: Record<string, number>;
  totalsByUser: Record<string, number>;
  byUserByCommand: Record<string, Record<string, number>>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA_DIR, "fun-usage.json");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function emptyState(): FunUsageFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalsByCommand: {},
    totalsByUser: {},
    byUserByCommand: {},
  };
}

async function loadState(): Promise<FunUsageFile> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as FunUsageFile;

    if (!parsed || typeof parsed !== "object") return emptyState();
    if (parsed.version !== 1) return emptyState();

    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      totalsByCommand:
        parsed.totalsByCommand && typeof parsed.totalsByCommand === "object"
          ? parsed.totalsByCommand
          : {},
      totalsByUser:
        parsed.totalsByUser && typeof parsed.totalsByUser === "object"
          ? parsed.totalsByUser
          : {},
      byUserByCommand:
        parsed.byUserByCommand && typeof parsed.byUserByCommand === "object"
          ? parsed.byUserByCommand
          : {},
    };
  } catch {
    return emptyState();
  }
}

async function saveState(state: FunUsageFile): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function inc(map: Record<string, number>, key: string, by = 1): void {
  const cur = map[key] ?? 0;
  map[key] = cur + by;
}

function incNested(
  map: Record<string, Record<string, number>>,
  outer: string,
  inner: string,
  by = 1,
): void {
  if (!map[outer]) map[outer] = {};
  inc(map[outer], inner, by);
}

export async function recordFunUsage(args: {
  userId: string;
  command: FunCommandKey;
}): Promise<void> {
  const { userId, command } = args;

  const state = await loadState();
  inc(state.totalsByCommand, command, 1);
  inc(state.totalsByUser, userId, 1);
  incNested(state.byUserByCommand, userId, command, 1);

  state.updatedAt = new Date().toISOString();
  await saveState(state);
}

export async function getFunUsageSnapshot(): Promise<FunUsageSnapshot> {
  const state = await loadState();
  return {
    updatedAt: state.updatedAt,
    totalsByCommand: state.totalsByCommand,
    totalsByUser: state.totalsByUser,
    byUserByCommand: state.byUserByCommand,
  };
}

export async function resetFunUsage(): Promise<void> {
  await saveState(emptyState());
}