// src/commands/achievements/achievements.testHelpers.ts
// Shared setup and check functions for achievement tests.

import { getDb } from "../../../services/core/database/db.js";

export function setupTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS rps_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      ties INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blackjack_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      ties INTEGER DEFAULT 0,
      blackjacks INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hangman_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      total_guesses INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS slots_stats (
      user_id TEXT PRIMARY KEY,
      spins INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      jackpots INTEGER DEFAULT 0,
      biggest_win TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wordle_stats (
      user_id TEXT PRIMARY KEY,
      played INTEGER DEFAULT 0,
      won INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      guess_distribution TEXT DEFAULT '{}',
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_checkins (
      user_id TEXT PRIMARY KEY,
      last_checkin INTEGER NOT NULL,
      streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      total_checkins INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trivia_stats (
      user_id TEXT PRIMARY KEY,
      correct INTEGER DEFAULT 0,
      wrong INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS coin_flips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      result TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      quote_text TEXT NOT NULL,
      added_by TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      context TEXT
    );
    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      host_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winner_count INTEGER DEFAULT 1,
      ends_at INTEGER NOT NULL,
      ended INTEGER DEFAULT 0,
      winners TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}

export function checkFirstWin(userId: string): boolean {
  const db = getDb();
  const tables = ["rps_stats", "blackjack_stats", "hangman_stats"];
  for (const table of tables) {
    try {
      const row = db
        .prepare(`SELECT wins FROM ${table} WHERE user_id = ?`)
        .get(userId) as { wins: number } | undefined;
      if (row && row.wins > 0) return true;
    } catch {
      /* table might not exist */
    }
  }
  return false;
}

export function checkTenWins(userId: string): boolean {
  const db = getDb();
  let total = 0;
  const tables = ["rps_stats", "blackjack_stats", "hangman_stats"];
  for (const table of tables) {
    try {
      const row = db
        .prepare(`SELECT wins FROM ${table} WHERE user_id = ?`)
        .get(userId) as { wins: number } | undefined;
      if (row) total += row.wins;
    } catch {
      /* table might not exist */
    }
  }
  return total >= 10;
}

export function checkJackpot(userId: string): boolean {
  const db = getDb();
  try {
    const row = db
      .prepare(`SELECT jackpots FROM slots_stats WHERE user_id = ?`)
      .get(userId) as { jackpots: number } | undefined;
    return (row?.jackpots ?? 0) >= 1;
  } catch {
    return false;
  }
}

export function checkDailyStreak7(userId: string): boolean {
  const db = getDb();
  try {
    const row = db
      .prepare(`SELECT best_streak FROM daily_checkins WHERE user_id = ?`)
      .get(userId) as { best_streak: number } | undefined;
    return (row?.best_streak ?? 0) >= 7;
  } catch {
    return false;
  }
}

export function checkCoinMaster(userId: string): boolean {
  const db = getDb();
  try {
    const row = db
      .prepare(`SELECT COUNT(*) as count FROM coin_flips WHERE user_id = ?`)
      .get(userId) as { count: number };
    return row.count >= 100;
  } catch {
    return false;
  }
}

export function checkQuotable(userId: string): boolean {
  const db = getDb();
  try {
    const row = db
      .prepare(`SELECT COUNT(*) as count FROM quotes WHERE author_id = ?`)
      .get(userId) as { count: number };
    return row.count >= 1;
  } catch {
    return false;
  }
}

export function checkGenerous(userId: string): boolean {
  const db = getDb();
  try {
    const row = db
      .prepare(`SELECT COUNT(*) as count FROM giveaways WHERE host_id = ?`)
      .get(userId) as { count: number };
    return row.count >= 3;
  } catch {
    return false;
  }
}
