// src/services/timezone/timezoneStore.ts

import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { logger } from "../../../utils/logger.js";

export type StoredTimezone = {
  version: 1;
  userId: string;
  guildId: string | null; // optional scoping; null means global
  timezone: string; // IANA zone, ex: America/New_York
  label?: string; // optional display label, ex: "EST" (never used for math)
  createdAt: string;
  updatedAt: string;
};

const StoredTimezoneSchema = z.object({
  version: z.literal(1),
  userId: z.string(),
  guildId: z.string().nullable(),
  timezone: z.string(),
  label: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const TimezoneStoreFileV1Schema = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  zones: z.record(z.string(), StoredTimezoneSchema),
});

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
    const json = JSON.parse(raw) as unknown;
    const result = TimezoneStoreFileV1Schema.safeParse(json);
    if (result.success) return result.data;
    logger.warn(
      { err: result.error.flatten() },
      "[timezone] store validation failed, using empty store",
    );
    return emptyStore();
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
    logger.error({ err }, "[timezoneStore] save threw");
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
    logger.error({ err }, "[timezoneStore] save after clear threw");
  }

  return true;
}
