// src/services/starboard/starboardStore.ts
// Starboard post persistence.

import { getDb } from "../../core/database/db.js";

export type StarboardPost = {
  original_message_id: string;
  starboard_message_id: string;
  guild_id: string;
  channel_id: string;
  star_count: number;
};

function ensureStarboardTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS starboard_posts (
      original_message_id TEXT PRIMARY KEY,
      starboard_message_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      star_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_starboard_guild ON starboard_posts(guild_id);
  `);
}

export function getStarboardPost(messageId: string): StarboardPost | null {
  ensureStarboardTable();
  const db = getDb();
  return db
    .prepare(`SELECT * FROM starboard_posts WHERE original_message_id = ?`)
    .get(messageId) as StarboardPost | null;
}

export function saveStarboardPost(data: {
  originalMessageId: string;
  starboardMessageId: string;
  guildId: string;
  channelId: string;
  starCount: number;
}): void {
  ensureStarboardTable();
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `INSERT OR REPLACE INTO starboard_posts 
     (original_message_id, starboard_message_id, guild_id, channel_id, star_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    data.originalMessageId,
    data.starboardMessageId,
    data.guildId,
    data.channelId,
    data.starCount,
    now,
  );
}

export function updateStarCount(messageId: string, starCount: number): void {
  ensureStarboardTable();
  const db = getDb();
  db.prepare(
    `UPDATE starboard_posts SET star_count = ? WHERE original_message_id = ?`,
  ).run(starCount, messageId);
}

export function deleteStarboardPost(messageId: string): void {
  ensureStarboardTable();
  const db = getDb();
  db.prepare(`DELETE FROM starboard_posts WHERE original_message_id = ?`).run(messageId);
}
