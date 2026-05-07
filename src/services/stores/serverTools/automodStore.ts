import { getDb } from "../../core/database/db.js";

export type AutomodSettings = {
  guildId: string;
  enabled: boolean;
  blockInvites: boolean;
  blockLinks: boolean;
  blockCaps: boolean;
  blockSpam: boolean;
  capsPercent: number;
  spamMessageCount: number;
  spamWindowSeconds: number;
};

export const DEFAULT_AUTOMOD_SETTINGS: Omit<AutomodSettings, "guildId"> = {
  enabled: false,
  blockInvites: true,
  blockLinks: false,
  blockCaps: false,
  blockSpam: true,
  capsPercent: 75,
  spamMessageCount: 5,
  spamWindowSeconds: 10,
};

export function ensureAutomodTables(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS automod_settings (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      block_invites INTEGER NOT NULL DEFAULT 1,
      block_links INTEGER NOT NULL DEFAULT 0,
      block_caps INTEGER NOT NULL DEFAULT 0,
      block_spam INTEGER NOT NULL DEFAULT 1,
      caps_percent INTEGER NOT NULL DEFAULT 75,
      spam_message_count INTEGER NOT NULL DEFAULT 5,
      spam_window_seconds INTEGER NOT NULL DEFAULT 10,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS automod_banned_words (
      guild_id TEXT NOT NULL,
      word TEXT NOT NULL,
      added_by TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, word)
    );
  `);
}

function bool(value: number | undefined, fallback: boolean): boolean {
  return value === undefined ? fallback : value === 1;
}

export function getAutomodSettings(guildId: string): AutomodSettings {
  ensureAutomodTables();
  const row = getDb()
    .prepare(
      `SELECT
        enabled,
        block_invites AS blockInvites,
        block_links AS blockLinks,
        block_caps AS blockCaps,
        block_spam AS blockSpam,
        caps_percent AS capsPercent,
        spam_message_count AS spamMessageCount,
        spam_window_seconds AS spamWindowSeconds
       FROM automod_settings
       WHERE guild_id = ?`,
    )
    .get(guildId) as
    | {
        enabled: number;
        blockInvites: number;
        blockLinks: number;
        blockCaps: number;
        blockSpam: number;
        capsPercent: number;
        spamMessageCount: number;
        spamWindowSeconds: number;
      }
    | undefined;

  return {
    guildId,
    enabled: bool(row?.enabled, DEFAULT_AUTOMOD_SETTINGS.enabled),
    blockInvites: bool(row?.blockInvites, DEFAULT_AUTOMOD_SETTINGS.blockInvites),
    blockLinks: bool(row?.blockLinks, DEFAULT_AUTOMOD_SETTINGS.blockLinks),
    blockCaps: bool(row?.blockCaps, DEFAULT_AUTOMOD_SETTINGS.blockCaps),
    blockSpam: bool(row?.blockSpam, DEFAULT_AUTOMOD_SETTINGS.blockSpam),
    capsPercent: row?.capsPercent ?? DEFAULT_AUTOMOD_SETTINGS.capsPercent,
    spamMessageCount:
      row?.spamMessageCount ?? DEFAULT_AUTOMOD_SETTINGS.spamMessageCount,
    spamWindowSeconds:
      row?.spamWindowSeconds ?? DEFAULT_AUTOMOD_SETTINGS.spamWindowSeconds,
  };
}

export function setAutomodSettings(
  guildId: string,
  patch: Partial<Omit<AutomodSettings, "guildId">>,
): AutomodSettings {
  ensureAutomodTables();
  const current = getAutomodSettings(guildId);
  const next = { ...current, ...patch };

  getDb()
    .prepare(
      `INSERT INTO automod_settings (
        guild_id,
        enabled,
        block_invites,
        block_links,
        block_caps,
        block_spam,
        caps_percent,
        spam_message_count,
        spam_window_seconds,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        enabled = excluded.enabled,
        block_invites = excluded.block_invites,
        block_links = excluded.block_links,
        block_caps = excluded.block_caps,
        block_spam = excluded.block_spam,
        caps_percent = excluded.caps_percent,
        spam_message_count = excluded.spam_message_count,
        spam_window_seconds = excluded.spam_window_seconds,
        updated_at = excluded.updated_at`,
    )
    .run(
      guildId,
      next.enabled ? 1 : 0,
      next.blockInvites ? 1 : 0,
      next.blockLinks ? 1 : 0,
      next.blockCaps ? 1 : 0,
      next.blockSpam ? 1 : 0,
      Math.max(1, Math.min(100, Math.floor(next.capsPercent))),
      Math.max(2, Math.min(20, Math.floor(next.spamMessageCount))),
      Math.max(3, Math.min(120, Math.floor(next.spamWindowSeconds))),
      Date.now(),
    );

  return getAutomodSettings(guildId);
}

export function addBannedWord(guildId: string, word: string, addedBy: string): string {
  ensureAutomodTables();
  const normalized = word.trim().toLowerCase();
  if (!normalized) throw new Error("Banned word cannot be empty");
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO automod_banned_words
        (guild_id, word, added_by, added_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(guildId, normalized, addedBy, Date.now());
  return normalized;
}

export function removeBannedWord(guildId: string, word: string): boolean {
  ensureAutomodTables();
  const result = getDb()
    .prepare(`DELETE FROM automod_banned_words WHERE guild_id = ? AND word = ?`)
    .run(guildId, word.trim().toLowerCase());
  return result.changes > 0;
}

export function listBannedWords(guildId: string): string[] {
  ensureAutomodTables();
  const rows = getDb()
    .prepare(
      `SELECT word FROM automod_banned_words WHERE guild_id = ? ORDER BY word ASC`,
    )
    .all(guildId) as { word: string }[];
  return rows.map((row) => row.word);
}
