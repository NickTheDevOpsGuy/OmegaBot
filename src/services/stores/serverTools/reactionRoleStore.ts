import { getDb } from "../../core/database/db.js";

export type ReactionRole = {
  guildId: string;
  messageId: string;
  emoji: string;
  roleId: string;
  channelId: string;
  createdBy: string;
  createdAt: number;
};

export function ensureReactionRoleTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS reaction_roles (
      guild_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      role_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, message_id, emoji)
    );

    CREATE INDEX IF NOT EXISTS idx_reaction_roles_message
      ON reaction_roles(guild_id, message_id);
  `);
}

export function normalizeEmojiKey(emoji: string): string {
  return emoji.trim();
}

export function addReactionRole(input: {
  guildId: string;
  messageId: string;
  emoji: string;
  roleId: string;
  channelId: string;
  createdBy: string;
}): ReactionRole {
  ensureReactionRoleTable();
  const emoji = normalizeEmojiKey(input.emoji);
  if (!emoji) throw new Error("Emoji cannot be empty");
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO reaction_roles
        (guild_id, message_id, emoji, role_id, channel_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, message_id, emoji) DO UPDATE SET
        role_id = excluded.role_id,
        channel_id = excluded.channel_id`,
    )
    .run(
      input.guildId,
      input.messageId,
      emoji,
      input.roleId,
      input.channelId,
      input.createdBy,
      now,
    );

  return { ...input, emoji, createdAt: now };
}

export function removeReactionRole(
  guildId: string,
  messageId: string,
  emoji: string,
): boolean {
  ensureReactionRoleTable();
  const result = getDb()
    .prepare(
      `DELETE FROM reaction_roles
       WHERE guild_id = ? AND message_id = ? AND emoji = ?`,
    )
    .run(guildId, messageId, normalizeEmojiKey(emoji));
  return result.changes > 0;
}

export function getReactionRole(
  guildId: string,
  messageId: string,
  emoji: string,
): ReactionRole | null {
  ensureReactionRoleTable();
  const row = getDb()
    .prepare(
      `SELECT
        guild_id AS guildId,
        message_id AS messageId,
        emoji,
        role_id AS roleId,
        channel_id AS channelId,
        created_by AS createdBy,
        created_at AS createdAt
       FROM reaction_roles
       WHERE guild_id = ? AND message_id = ? AND emoji = ?`,
    )
    .get(guildId, messageId, normalizeEmojiKey(emoji)) as ReactionRole | undefined;
  return row ?? null;
}

export function listReactionRoles(guildId: string): ReactionRole[] {
  ensureReactionRoleTable();
  return getDb()
    .prepare(
      `SELECT
        guild_id AS guildId,
        message_id AS messageId,
        emoji,
        role_id AS roleId,
        channel_id AS channelId,
        created_by AS createdBy,
        created_at AS createdAt
       FROM reaction_roles
       WHERE guild_id = ?
       ORDER BY created_at DESC`,
    )
    .all(guildId) as ReactionRole[];
}
