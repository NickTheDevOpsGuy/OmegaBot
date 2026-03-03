// src/commands/giveaway/giveawayStore.ts
//
// Database operations for the giveaway system.
// Handles CRUD for giveaways and entries.

import { getAll, getDb, getRow } from "../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type Giveaway = {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  host_id: string;
  prize: string;
  winner_count: number;
  ends_at: number;
  ended: number;
  winners: string | null;
  created_at: number;
};

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

export function ensureGiveawayTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      host_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winner_count INTEGER NOT NULL DEFAULT 1,
      ends_at INTEGER NOT NULL,
      ended INTEGER NOT NULL DEFAULT 0,
      winners TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
      giveaway_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      entered_at INTEGER NOT NULL,
      PRIMARY KEY (giveaway_id, user_id),
      FOREIGN KEY (giveaway_id) REFERENCES giveaways(id)
    );

    CREATE INDEX IF NOT EXISTS idx_giveaways_ends ON giveaways(ends_at) WHERE ended = 0;
  `);
}

/* -------------------------------------------------------------------------- */
/* Giveaway CRUD                                                               */
/* -------------------------------------------------------------------------- */

export function createGiveaway(data: {
  guildId: string;
  channelId: string;
  hostId: string;
  prize: string;
  winnerCount: number;
  endsAt: number;
}): number {
  ensureGiveawayTables();
  const db = getDb();
  const now = Date.now();

  const result = db
    .prepare(
      `INSERT INTO giveaways (guild_id, channel_id, host_id, prize, winner_count, ends_at, ended, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    )
    .run(
      data.guildId,
      data.channelId,
      data.hostId,
      data.prize,
      data.winnerCount,
      data.endsAt,
      now,
    );

  return Number(result.lastInsertRowid);
}

export function setGiveawayMessage(giveawayId: number, messageId: string): void {
  const db = getDb();
  db.prepare(`UPDATE giveaways SET message_id = ? WHERE id = ?`).run(
    messageId,
    giveawayId,
  );
}

export function getGiveaway(giveawayId: number): Giveaway | null {
  ensureGiveawayTables();
  const db = getDb();
  const row = getRow<Giveaway>(
    db.prepare(`SELECT * FROM giveaways WHERE id = ?`),
    giveawayId,
  );
  return row ?? null;
}

export function getGiveawayByMessage(messageId: string): Giveaway | null {
  ensureGiveawayTables();
  const db = getDb();
  const row = getRow<Giveaway>(
    db.prepare(`SELECT * FROM giveaways WHERE message_id = ?`),
    messageId,
  );
  return row ?? null;
}

export function getActiveGiveaways(guildId: string): Giveaway[] {
  ensureGiveawayTables();
  const db = getDb();
  return getAll<Giveaway>(
    db.prepare(
      `SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 ORDER BY ends_at ASC`,
    ),
    guildId,
  );
}

export function getEndedGiveaways(guildId: string): Giveaway[] {
  ensureGiveawayTables();
  const db = getDb();
  return getAll<Giveaway>(
    db.prepare(
      `SELECT * FROM giveaways WHERE guild_id = ? AND ended = 1 ORDER BY ends_at DESC LIMIT 25`,
    ),
    guildId,
  );
}

export function getExpiredGiveaways(): Giveaway[] {
  ensureGiveawayTables();
  const db = getDb();
  const now = Date.now();
  return getAll<Giveaway>(
    db.prepare(`SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= ?`),
    now,
  );
}

export function endGiveaway(giveawayId: number, winners: string[]): void {
  const db = getDb();
  db.prepare(`UPDATE giveaways SET ended = 1, winners = ? WHERE id = ?`).run(
    JSON.stringify(winners),
    giveawayId,
  );
}

/* -------------------------------------------------------------------------- */
/* Entry Management                                                            */
/* -------------------------------------------------------------------------- */

export function addEntry(giveawayId: number, userId: string): boolean {
  ensureGiveawayTables();
  const db = getDb();
  const now = Date.now();

  try {
    db.prepare(
      `INSERT INTO giveaway_entries (giveaway_id, user_id, entered_at) VALUES (?, ?, ?)`,
    ).run(giveawayId, userId, now);
    return true;
  } catch {
    return false; // Already entered (primary key constraint)
  }
}

export function removeEntry(giveawayId: number, userId: string): boolean {
  ensureGiveawayTables();
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?`)
    .run(giveawayId, userId);
  return result.changes > 0;
}

type GiveawayEntryRow = { user_id: string };
type CountRow = { count: number };

export function getEntries(giveawayId: number): string[] {
  ensureGiveawayTables();
  const db = getDb();
  const rows = getAll<GiveawayEntryRow>(
    db.prepare(`SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?`),
    giveawayId,
  );
  return rows.map((r) => r.user_id);
}

export function getEntryCount(giveawayId: number): number {
  ensureGiveawayTables();
  const db = getDb();
  const row = getRow<CountRow>(
    db.prepare(`SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = ?`),
    giveawayId,
  );
  return row?.count ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Winner Selection                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Select random winners using Fisher-Yates shuffle.
 * Returns up to `count` unique winners from the entry pool.
 */
export function selectWinners(giveawayId: number, count: number): string[] {
  const entries = getEntries(giveawayId);
  if (entries.length === 0) return [];

  // Fisher-Yates shuffle for unbiased random selection
  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}
