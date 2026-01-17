// src/services/timezone/timezoneStore.ts

import { promises as fs } from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";

export type StoredTimezone = {
  version: 1;
  userId: string;
  guildId: string | null; // optional scoping; null means global
  timezone: string; // IANA zone, ex: America/New_York
  label?: string; // optional display label, ex: "EST" (never used for math)
  createdAt: string;
  updatedAt: string;
};

type TimezoneStoreFileV1 = {
  version: 1;
  updatedAt: string;
  // Keyed by "guildId:userId" if guild-scoped, otherwise "global:userId"
  zones: Record<string, StoredTimezone>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "timezones.json");

function nowIso(): string {
  return new Date().toISOString();
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function emptyStore(): TimezoneStoreFileV1 {
  return {
    version: 1,
    updatedAt: nowIso(),
    zones: {},
  };
}

function makeKey(args: {
  guildId: string | null;
  userId: string;
  scope: "guild" | "global";
}): string {
  if (args.scope === "guild") {
    return `${args.guildId ?? "noguild"}:${args.userId}`;
  }
  return `global:${args.userId}`;
}

async function loadStore(): Promise<TimezoneStoreFileV1> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<TimezoneStoreFileV1> | null;

    if (!parsed || typeof parsed !== "object") return emptyStore();
    if (parsed.version !== 1) return emptyStore();

    const zones = parsed.zones && typeof parsed.zones === "object" ? parsed.zones : {};

    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso(),
      zones: zones as Record<string, StoredTimezone>,
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: TimezoneStoreFileV1): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function setUserTimezone(args: {
  userId: string;
  guildId: string | null;
  scope: "guild" | "global";
  timezone: string;
  label?: string;
}): Promise<StoredTimezone> {
  const store = await loadStore();
  const key = makeKey({ guildId: args.guildId, userId: args.userId, scope: args.scope });

  const existing = store.zones[key];
  const createdAt = existing?.createdAt ?? nowIso();

  const tz: StoredTimezone = {
    version: 1,
    userId: args.userId,
    guildId: args.scope === "guild" ? args.guildId : null,
    timezone: args.timezone,
    label: args.label,
    createdAt,
    updatedAt: nowIso(),
  };

  store.zones[key] = tz;
  store.updatedAt = nowIso();

  try {
    await saveStore(store);
  } catch (err) {
    logger.error({ err }, "[timezoneStore] failed to save");
  }

  return tz;
}

export async function getUserTimezone(args: {
  userId: string;
  guildId: string | null;
  scope: "guild" | "global";
}): Promise<StoredTimezone | null> {
  const store = await loadStore();
  const key = makeKey({ guildId: args.guildId, userId: args.userId, scope: args.scope });
  return store.zones[key] ?? null;
}

export async function clearUserTimezone(args: {
  userId: string;
  guildId: string | null;
  scope: "guild" | "global";
}): Promise<boolean> {
  const store = await loadStore();
  const key = makeKey({ guildId: args.guildId, userId: args.userId, scope: args.scope });

  if (!store.zones[key]) return false;

  delete store.zones[key];
  store.updatedAt = nowIso();

  try {
    await saveStore(store);
  } catch (err) {
    logger.error({ err }, "[timezoneStore] failed to save after clear");
  }

  return true;
}
