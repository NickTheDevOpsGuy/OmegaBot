// src/services/config/guildConfigStore.ts

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "path";
import {
  DEFAULT_GUILD_CONFIG,
  type GuildConfig,
  type GuildConfigPatch,
} from "./types.js";

/**
 * Simple JSON-backed store for guild configuration.
 *
 * Design goals:
 * - Extremely easy to run locally
 * - No external dependencies (DB)
 * - Durable across restarts
 *
 * Notes:
 * - This implementation reads/writes the file per call.
 *   That’s fine for small bots. If you scale, add caching + periodic flush.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "guild-config.json");

/**
 * Stored JSON shape:
 * {
 *   "<guildId>": { welcomeEnabled: true, welcomeChannelId: "..." },
 *   "<guildId2>": { ... }
 * }
 */
type StoreShape = Record<string, Omit<GuildConfig, "guildId">>;

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    return parsed ?? {};
  } catch {
    // Missing file, invalid JSON, etc.
    return {};
  }
}

async function writeStore(store: StoreShape): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

/**
 * Get the effective config for a guild.
 * Always returns a fully-populated config object (defaults applied).
 */
export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  const store = await readStore();
  const saved = store[guildId] ?? {};
  return { guildId, ...DEFAULT_GUILD_CONFIG, ...saved };
}

/**
 * Update the stored config for a guild by patching values.
 * Returns the updated effective config (defaults applied).
 */
export async function setGuildConfig(
  guildId: string,
  patch: GuildConfigPatch,
): Promise<GuildConfig> {
  const store = await readStore();

  // Apply defaults for new guilds, then patch on top.
  const current = store[guildId] ?? DEFAULT_GUILD_CONFIG;
  const next: Omit<GuildConfig, "guildId"> = { ...current, ...patch };

  store[guildId] = next;
  await writeStore(store);

  return { guildId, ...next };
}
