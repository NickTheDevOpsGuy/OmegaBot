// src/commands/fun/subcommands/connect4Store.ts
//
// Database operations for Connect 4 stats.

import { getDb } from "../../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

export function ensureConnect4Table(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS connect4_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connect4_h2h (
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      user1_wins INTEGER NOT NULL DEFAULT 0,
      user2_wins INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user1_id, user2_id)
    );
  `);
}

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type C4Stats = {
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
};

/* -------------------------------------------------------------------------- */
/* Stats Operations                                                            */
/* -------------------------------------------------------------------------- */

export function getStats(userId: string): C4Stats {
  ensureConnect4Table();
  const db = getDb();

  type Row = { wins: number; losses: number; ties: number };
  const row = db
    .prepare(`SELECT wins, losses, ties FROM connect4_stats WHERE user_id = ?`)
    .get(userId) as Row | undefined;

  if (!row) return { wins: 0, losses: 0, ties: 0, winRate: 0 };

  const total = row.wins + row.losses + row.ties;
  return { ...row, winRate: total > 0 ? Math.round((row.wins / total) * 100) : 0 };
}

export function recordResult(
  winnerId: string | null,
  loserId: string | null,
  player1Id: string,
  player2Id: string,
): void {
  ensureConnect4Table();
  const db = getDb();
  const now = Date.now();

  if (winnerId && loserId) {
    db.prepare(
      `INSERT INTO connect4_stats (user_id, wins, losses, ties, updated_at)
       VALUES (?, 1, 0, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET wins = wins + 1, updated_at = ?`,
    ).run(winnerId, now, now);

    db.prepare(
      `INSERT INTO connect4_stats (user_id, wins, losses, ties, updated_at)
       VALUES (?, 0, 1, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET losses = losses + 1, updated_at = ?`,
    ).run(loserId, now, now);
  } else {
    for (const id of [player1Id, player2Id]) {
      db.prepare(
        `INSERT INTO connect4_stats (user_id, wins, losses, ties, updated_at)
         VALUES (?, 0, 0, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET ties = ties + 1, updated_at = ?`,
      ).run(id, now, now);
    }
  }

  const [id1, id2] = [player1Id, player2Id].sort();
  const isPlayer1Winner = winnerId === id1;
  const isPlayer2Winner = winnerId === id2;
  const isTie = !winnerId;

  db.prepare(
    `INSERT INTO connect4_h2h (user1_id, user2_id, user1_wins, user2_wins, ties, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user1_id, user2_id) DO UPDATE SET
       user1_wins = user1_wins + ?,
       user2_wins = user2_wins + ?,
       ties = ties + ?,
       updated_at = ?`,
  ).run(
    id1,
    id2,
    isPlayer1Winner ? 1 : 0,
    isPlayer2Winner ? 1 : 0,
    isTie ? 1 : 0,
    now,
    isPlayer1Winner ? 1 : 0,
    isPlayer2Winner ? 1 : 0,
    isTie ? 1 : 0,
    now,
  );
}
