import { getDb } from "../../core/database/db.js";

export type WarningRecord = {
  id: number;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  source: "manual" | "automod";
  createdAt: number;
  clearedAt: number | null;
};

export function ensureWarningsTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS mod_warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at INTEGER NOT NULL,
      cleared_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_mod_warnings_user
      ON mod_warnings(guild_id, user_id, cleared_at, created_at DESC);
  `);
}

function mapWarning(row: {
  id: number;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  source: "manual" | "automod";
  createdAt: number;
  clearedAt: number | null;
}): WarningRecord {
  return row;
}

export function addWarning(input: {
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  source?: "manual" | "automod";
}): WarningRecord {
  ensureWarningsTable();
  const now = Date.now();
  const result = getDb()
    .prepare(
      `INSERT INTO mod_warnings
        (guild_id, user_id, moderator_id, reason, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.guildId,
      input.userId,
      input.moderatorId,
      input.reason.trim() || "No reason provided",
      input.source ?? "manual",
      now,
    );

  return {
    id: Number(result.lastInsertRowid),
    guildId: input.guildId,
    userId: input.userId,
    moderatorId: input.moderatorId,
    reason: input.reason.trim() || "No reason provided",
    source: input.source ?? "manual",
    createdAt: now,
    clearedAt: null,
  };
}

export function listWarnings(guildId: string, userId: string): WarningRecord[] {
  ensureWarningsTable();
  const rows = getDb()
    .prepare(
      `SELECT
        id,
        guild_id AS guildId,
        user_id AS userId,
        moderator_id AS moderatorId,
        reason,
        source,
        created_at AS createdAt,
        cleared_at AS clearedAt
       FROM mod_warnings
       WHERE guild_id = ? AND user_id = ? AND cleared_at IS NULL
       ORDER BY created_at DESC`,
    )
    .all(guildId, userId) as Parameters<typeof mapWarning>[0][];
  return rows.map(mapWarning);
}

export function clearWarning(guildId: string, warningId: number): boolean {
  ensureWarningsTable();
  const result = getDb()
    .prepare(
      `UPDATE mod_warnings
       SET cleared_at = ?
       WHERE guild_id = ? AND id = ? AND cleared_at IS NULL`,
    )
    .run(Date.now(), guildId, Math.floor(warningId));
  return result.changes > 0;
}
