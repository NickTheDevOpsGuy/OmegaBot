// src/services/timezone/timezoneStore.ts

import { getDb } from "../../core/database/db.js";
import { logger } from "../../../utils/logger.js";

export type StoredTimezone = {
  version: 1;
  userId: string;
  guildId: string | null;
  timezone: string;
  label?: string;
  createdAt: string;
  updatedAt: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function scopeKey(scope: "guild" | "global", guildId: string | null): string {
  return scope === "guild" ? (guildId ?? "noguild") : "global";
}

function toStored(row: {
  scope: "guild" | "global";
  user_id: string;
  guild_id: string | null;
  timezone: string;
  label: string | null;
  created_at: string;
  updated_at: string;
}): StoredTimezone {
  return {
    version: 1,
    userId: row.user_id,
    guildId: row.scope === "guild" ? row.guild_id : null,
    timezone: row.timezone,
    label: row.label ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function setUserTimezone(args: {
  userId: string;
  guildId: string | null;
  scope: "guild" | "global";
  timezone: string;
  label?: string;
}): Promise<StoredTimezone> {
  const now = nowIso();
  const guildId = scopeKey(args.scope, args.guildId);
  const existing = await getUserTimezone({
    userId: args.userId,
    guildId: args.guildId,
    scope: args.scope,
  });
  const createdAt = existing?.createdAt ?? now;

  try {
    getDb()
      .prepare(
        `INSERT INTO user_timezones_scoped
          (scope, guild_id, user_id, timezone, label, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(scope, guild_id, user_id) DO UPDATE SET
          timezone = excluded.timezone,
          label = excluded.label,
          updated_at = excluded.updated_at`,
      )
      .run(
        args.scope,
        guildId,
        args.userId,
        args.timezone,
        args.label ?? null,
        createdAt,
        now,
      );
  } catch (err) {
    logger.error({ err }, "[timezoneStore] save threw");
  }

  return {
    version: 1,
    userId: args.userId,
    guildId,
    timezone: args.timezone,
    label: args.label,
    createdAt,
    updatedAt: now,
  };
}

export async function getUserTimezone(args: {
  userId: string;
  guildId: string | null;
  scope: "guild" | "global";
}): Promise<StoredTimezone | null> {
  const row = getDb()
    .prepare(
      `SELECT scope, user_id, guild_id, timezone, label, created_at, updated_at
       FROM user_timezones_scoped
       WHERE scope = ? AND guild_id = ? AND user_id = ?`,
    )
    .get(args.scope, scopeKey(args.scope, args.guildId), args.userId) as
    | {
        scope: "guild" | "global";
        user_id: string;
        guild_id: string | null;
        timezone: string;
        label: string | null;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  return row ? toStored(row) : null;
}

export async function clearUserTimezone(args: {
  userId: string;
  guildId: string | null;
  scope: "guild" | "global";
}): Promise<boolean> {
  try {
    const result = getDb()
      .prepare(
        `DELETE FROM user_timezones_scoped
       WHERE scope = ? AND guild_id = ? AND user_id = ?`,
      )
      .run(args.scope, scopeKey(args.scope, args.guildId), args.userId);
    return result.changes > 0;
  } catch (err) {
    logger.error({ err }, "[timezoneStore] clear threw");
    return false;
  }
}
