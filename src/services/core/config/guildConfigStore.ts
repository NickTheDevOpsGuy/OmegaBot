// src/services/config/guildConfigStore.ts

import { readFile } from "node:fs/promises";
import path from "path";
import {
  DEFAULT_GUILD_CONFIG,
  type GuildConfig,
  type GuildConfigPatch,
} from "./types.js";
import { getDb } from "../database/db.js";
import { logger } from "../../../utils/logger.js";

/**
 * SQLite-backed store for guild configuration.
 *
 * The old JSON file is still read as a one-way import path when a guild has no
 * database row yet. New writes go only to SQLite.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const LEGACY_FILE_PATH = path.join(DATA_DIR, "guild-config.json");

/**
 * Legacy JSON shape:
 * {
 *   "<guildId>": { welcomeEnabled: true, welcomeChannelId: "..." },
 *   "<guildId2>": { ... }
 * }
 */
type StoreShape = Record<string, Omit<GuildConfig, "guildId">>;

type GuildConfigRow = {
  config: string;
  updated_at: number;
};

function ensureGuildConfigTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

async function readLegacyStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(LEGACY_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    return parsed ?? {};
  } catch {
    // Missing file, invalid JSON, etc. Legacy import is best-effort.
    return {};
  }
}

function parseStoredConfig(guildId: string, row: GuildConfigRow): GuildConfig {
  try {
    const saved = JSON.parse(row.config) as Partial<Omit<GuildConfig, "guildId">>;
    return {
      guildId,
      ...DEFAULT_GUILD_CONFIG,
      ...saved,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    logger.warn({ err, guildId }, "[config] stored guild config JSON invalid");
    return { guildId, ...DEFAULT_GUILD_CONFIG };
  }
}

function writeConfig(guildId: string, config: Omit<GuildConfig, "guildId">): void {
  ensureGuildConfigTable();
  getDb()
    .prepare(
      `INSERT INTO guild_config (guild_id, config, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
        config = excluded.config,
        updated_at = excluded.updated_at`,
    )
    .run(guildId, JSON.stringify(config), config.updatedAt);
}

async function importLegacyConfig(guildId: string): Promise<GuildConfig | null> {
  const legacy = await readLegacyStore();
  const saved = legacy[guildId];
  if (!saved) return null;

  const next: Omit<GuildConfig, "guildId"> = {
    ...DEFAULT_GUILD_CONFIG,
    ...saved,
    updatedAt: saved.updatedAt || Date.now(),
  };
  writeConfig(guildId, next);
  logger.info({ guildId }, "[config] imported legacy JSON guild config into SQLite");
  return { guildId, ...next };
}

/**
 * Get the effective config for a guild.
 * Always returns a fully-populated config object (defaults applied).
 */
export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  ensureGuildConfigTable();
  const row = getDb()
    .prepare(`SELECT config, updated_at FROM guild_config WHERE guild_id = ?`)
    .get(guildId) as GuildConfigRow | undefined;

  if (row) return parseStoredConfig(guildId, row);

  const imported = await importLegacyConfig(guildId);
  if (imported) return imported;

  return { guildId, ...DEFAULT_GUILD_CONFIG };
}

/**
 * Update the stored config for a guild by patching values.
 * Returns the updated effective config (defaults applied).
 */
export async function setGuildConfig(
  guildId: string,
  patch: GuildConfigPatch,
): Promise<GuildConfig> {
  const current = await getGuildConfig(guildId);
  const { guildId: _guildId, ...currentValues } = current;
  const next: Omit<GuildConfig, "guildId"> = {
    ...currentValues,
    ...patch,
    updatedAt: Date.now(),
  };

  writeConfig(guildId, next);

  return { guildId, ...next };
}
