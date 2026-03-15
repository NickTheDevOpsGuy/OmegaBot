// src/services/platform/userService.ts
//
// Platform user accounts: map Discord (and future web OAuth) to a single profile.
// Existing game/progression data is keyed by discord_id; this table caches username/avatar
// and can later support account linking (e.g. discord_id + email).

import { randomUUID } from "node:crypto";
import { getDb } from "../core/database/db.js";

export type PlatformUser = {
  userId: string;
  discordId: string | null;
  username: string;
  avatarUrl: string | null;
  createdAt: number;
  updatedAt: number;
};

function ensureTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_users (
      user_id TEXT PRIMARY KEY,
      discord_id TEXT UNIQUE,
      username TEXT NOT NULL,
      avatar_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_platform_users_discord ON platform_users(discord_id);
  `);
}

/**
 * Get or create a platform user by Discord ID. Updates username/avatar if provided.
 * Returns the platform user; existing game data is keyed by discordId in other tables.
 */
export function getOrCreateByDiscord(
  discordId: string,
  username?: string,
  avatarUrl?: string | null,
): PlatformUser {
  ensureTable();
  const db = getDb();
  const now = Date.now();
  const row = db
    .prepare(
      `SELECT user_id AS userId, discord_id AS discordId, username, avatar_url AS avatarUrl, created_at AS createdAt, updated_at AS updatedAt
       FROM platform_users WHERE discord_id = ?`,
    )
    .get(discordId) as PlatformUser | undefined;

  if (row) {
    const updates = username != null || avatarUrl !== undefined;
    if (updates) {
      const u = username ?? row.username;
      const a = avatarUrl !== undefined ? avatarUrl : row.avatarUrl;
      db.prepare(
        `UPDATE platform_users SET username = ?, avatar_url = ?, updated_at = ? WHERE user_id = ?`,
      ).run(u, a, now, row.userId);
      return { ...row, username: u, avatarUrl: a, updatedAt: now };
    }
    return row;
  }

  const userId = randomUUID();
  db.prepare(
    `INSERT INTO platform_users (user_id, discord_id, username, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(userId, discordId, username ?? discordId, avatarUrl ?? null, now, now);

  return {
    userId,
    discordId,
    username: username ?? discordId,
    avatarUrl: avatarUrl ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Get platform user by internal user_id or by discord_id. */
export function getPlatformUser(userIdOrDiscordId: string): PlatformUser | null {
  ensureTable();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT user_id AS userId, discord_id AS discordId, username, avatar_url AS avatarUrl, created_at AS createdAt, updated_at AS updatedAt
       FROM platform_users WHERE user_id = ? OR discord_id = ?`,
    )
    .get(userIdOrDiscordId, userIdOrDiscordId) as PlatformUser | undefined;
  return row ?? null;
}

/** Resolve to a discord_id for use with existing game/progression tables. Returns input if already discord_id, else looks up. */
export function resolveDiscordId(userIdOrDiscordId: string): string | null {
  const u = getPlatformUser(userIdOrDiscordId);
  if (u) return u.discordId ?? u.userId;
  if (/^\d{17,19}$/.test(userIdOrDiscordId)) return userIdOrDiscordId;
  return null;
}
