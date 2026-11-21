// src/services/config/guildConfigStore.ts

import {
  DEFAULT_GUILD_CONFIG,
  type GuildConfig,
  type GuildConfigPatch,
} from "./types.js";
import { getDb } from "../database/db.js";
import { logger } from "../../../utils/logger.js";

/**
 * SQLite-backed store for guild configuration.
 */

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
    logger.warn({ err, guildId }, "[config] stored guild config payload invalid");
    return { guildId, ...DEFAULT_GUILD_CONFIG };
  }
}

function writeConfig(
  guildId: string,
  config: Partial<Omit<GuildConfig, "guildId">> & { updatedAt: number },
): void {
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

export async function setGuildWelcomeMessage(
  guildId: string,
  welcomeMessage: string,
): Promise<GuildConfig> {
  return setGuildConfig(guildId, {
    welcomeMessage,
    welcomeEnabled: true,
  });
}

export async function clearGuildWelcomeMessage(guildId: string): Promise<GuildConfig> {
  const current = await getGuildConfig(guildId);
  const {
    guildId: _guildId,
    welcomeMessage: _welcomeMessage,
    ...currentValues
  } = current;
  const next = {
    ...currentValues,
    welcomeEnabled: true,
    updatedAt: Date.now(),
  };

  writeConfig(guildId, next);

  return { guildId, ...next, welcomeMessage: null };
}
