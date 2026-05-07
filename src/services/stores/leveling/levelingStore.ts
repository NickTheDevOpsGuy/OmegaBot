import { getDb } from "../../core/database/db.js";
import {
  buildProgressBar,
  getLevelFromXp,
  xpRequiredForLevel,
} from "../progression/progressionMath.js";

export type GuildLevelingProgress = {
  guildId: string;
  userId: string;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  messageCount: number;
  rank: number | null;
};

export type GuildLevelingAward = {
  amount: number;
  before: GuildLevelingProgress;
  after: GuildLevelingProgress;
  leveledUp: boolean;
};

export type LevelRoleReward = {
  guildId: string;
  level: number;
  roleId: string;
};

export type LeaderboardEntry = GuildLevelingProgress;

export function ensureLevelingTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_user_xp (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      message_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_guild_user_xp_leaderboard
      ON guild_user_xp(guild_id, xp DESC, updated_at ASC);

    CREATE TABLE IF NOT EXISTS level_role_rewards (
      guild_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, level)
    );

    CREATE INDEX IF NOT EXISTS idx_level_role_rewards_guild
      ON level_role_rewards(guild_id, level);
  `);
}

function toProgress(
  guildId: string,
  userId: string,
  xp: number,
  messageCount: number,
  rank: number | null,
): GuildLevelingProgress {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = getLevelFromXp(safeXp);
  const currentLevelXpFloor = xpRequiredForLevel(level);
  const nextLevelXpFloor = xpRequiredForLevel(level + 1);

  return {
    guildId,
    userId,
    xp: safeXp,
    level,
    xpIntoLevel: safeXp - currentLevelXpFloor,
    xpForNextLevel: nextLevelXpFloor - currentLevelXpFloor,
    messageCount,
    rank,
  };
}

export function getGuildProgression(
  guildId: string,
  userId: string,
): GuildLevelingProgress {
  ensureLevelingTables();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT xp, message_count AS messageCount
       FROM guild_user_xp
       WHERE guild_id = ? AND user_id = ?`,
    )
    .get(guildId, userId) as { xp: number; messageCount: number } | undefined;

  const rankRow = db
    .prepare(
      `SELECT COUNT(*) + 1 AS rank
       FROM guild_user_xp
       WHERE guild_id = ?
         AND xp > COALESCE((SELECT xp FROM guild_user_xp WHERE guild_id = ? AND user_id = ?), 0)`,
    )
    .get(guildId, guildId, userId) as { rank: number } | undefined;

  return toProgress(
    guildId,
    userId,
    row?.xp ?? 0,
    row?.messageCount ?? 0,
    row ? (rankRow?.rank ?? null) : null,
  );
}

export function awardGuildMessageXp(
  guildId: string,
  userId: string,
  amount: number,
): GuildLevelingAward {
  ensureLevelingTables();
  const safeAmount = Math.max(0, Math.floor(amount));
  const before = getGuildProgression(guildId, userId);

  if (safeAmount === 0) {
    return { amount: 0, before, after: before, leveledUp: false };
  }

  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO guild_user_xp (guild_id, user_id, xp, message_count, updated_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET
         xp = xp + ?,
         message_count = message_count + 1,
         updated_at = ?`,
    )
    .run(guildId, userId, safeAmount, now, safeAmount, now);

  const after = getGuildProgression(guildId, userId);
  return {
    amount: safeAmount,
    before,
    after,
    leveledUp: after.level > before.level,
  };
}

export function getGuildLeaderboard(
  guildId: string,
  limit = 10,
): LeaderboardEntry[] {
  ensureLevelingTables();
  const rows = getDb()
    .prepare(
      `SELECT user_id AS userId, xp, message_count AS messageCount
       FROM guild_user_xp
       WHERE guild_id = ?
       ORDER BY xp DESC, updated_at ASC
       LIMIT ?`,
    )
    .all(guildId, Math.max(1, Math.min(25, Math.floor(limit)))) as {
    userId: string;
    xp: number;
    messageCount: number;
  }[];

  return rows.map((row, index) =>
    toProgress(guildId, row.userId, row.xp, row.messageCount, index + 1),
  );
}

export function setLevelRoleReward(
  guildId: string,
  level: number,
  roleId: string,
): LevelRoleReward {
  ensureLevelingTables();
  const safeLevel = Math.max(1, Math.floor(level));
  getDb()
    .prepare(
      `INSERT INTO level_role_rewards (guild_id, level, role_id, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id, level) DO UPDATE SET role_id = excluded.role_id`,
    )
    .run(guildId, safeLevel, roleId, Date.now());

  return { guildId, level: safeLevel, roleId };
}

export function removeLevelRoleReward(guildId: string, level: number): boolean {
  ensureLevelingTables();
  const result = getDb()
    .prepare(`DELETE FROM level_role_rewards WHERE guild_id = ? AND level = ?`)
    .run(guildId, Math.max(1, Math.floor(level)));
  return result.changes > 0;
}

export function listLevelRoleRewards(guildId: string): LevelRoleReward[] {
  ensureLevelingTables();
  return getDb()
    .prepare(
      `SELECT guild_id AS guildId, level, role_id AS roleId
       FROM level_role_rewards
       WHERE guild_id = ?
       ORDER BY level ASC`,
    )
    .all(guildId) as LevelRoleReward[];
}

export function getUnlockedLevelRoleRewards(
  guildId: string,
  level: number,
): LevelRoleReward[] {
  ensureLevelingTables();
  return getDb()
    .prepare(
      `SELECT guild_id AS guildId, level, role_id AS roleId
       FROM level_role_rewards
       WHERE guild_id = ? AND level <= ?
       ORDER BY level ASC`,
    )
    .all(guildId, Math.max(1, Math.floor(level))) as LevelRoleReward[];
}

export { buildProgressBar };
