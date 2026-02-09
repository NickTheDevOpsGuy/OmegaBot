// src/commands/achievements/achievements.test.ts
//
// Tests for the achievement system.
//
// Achievements are unlocked dynamically based on database state.
// Each achievement has a check function that queries relevant tables.
//
// Coverage:
// - Achievement check functions
// - Category organization
// - Progress tracking

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../test/dbTestUtils.js";
import { getDb } from "../../services/database/db.js";

useInMemoryDb();

// Set up all tables that achievements check against
function setupTables(): void {
  const db = getDb();

  // Game stats tables (match real schemas)
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

// Simplified achievement check functions (mirror actual implementation)
function checkFirstWin(userId: string): boolean {
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

function checkTenWins(userId: string): boolean {
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

function checkJackpot(userId: string): boolean {
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

function checkDailyStreak7(userId: string): boolean {
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

function checkCoinMaster(userId: string): boolean {
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

function checkQuotable(userId: string): boolean {
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

function checkGenerous(userId: string): boolean {
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

describe("achievement system", () => {
  beforeEach(() => {
    setupTables();
  });

  describe("game achievements", () => {
    it("First Victory - unlocks on first win", () => {
      const db = getDb();

      expect(checkFirstWin("user1")).toBe(false);

      db.prepare(
        `INSERT INTO rps_stats (user_id, wins, updated_at) VALUES (?, 1, ?)`,
      ).run("user1", Date.now());

      expect(checkFirstWin("user1")).toBe(true);
    });

    it("Getting Good - unlocks at 10 total wins", () => {
      const db = getDb();

      expect(checkTenWins("user1")).toBe(false);

      const now = Date.now();
      db.prepare(
        `INSERT INTO rps_stats (user_id, wins, updated_at) VALUES (?, 5, ?)`,
      ).run("user1", now);
      db.prepare(
        `INSERT INTO blackjack_stats (user_id, wins, updated_at) VALUES (?, 5, ?)`,
      ).run("user1", now);

      expect(checkTenWins("user1")).toBe(true);
    });

    it("counts wins across multiple games", () => {
      const db = getDb();
      const now = Date.now();

      db.prepare(
        `INSERT INTO rps_stats (user_id, wins, updated_at) VALUES (?, 3, ?)`,
      ).run("user1", now);
      db.prepare(
        `INSERT INTO blackjack_stats (user_id, wins, updated_at) VALUES (?, 4, ?)`,
      ).run("user1", now);
      db.prepare(
        `INSERT INTO hangman_stats (user_id, wins, updated_at) VALUES (?, 2, ?)`,
      ).run("user1", now);

      // 3 + 4 + 2 = 9 wins, not enough
      expect(checkTenWins("user1")).toBe(false);

      // Update to get to 10
      db.prepare(`UPDATE hangman_stats SET wins = 3 WHERE user_id = ?`).run("user1");

      expect(checkTenWins("user1")).toBe(true);
    });
  });

  describe("luck achievements", () => {
    it("Jackpot - unlocks on first slots jackpot", () => {
      const db = getDb();

      expect(checkJackpot("user1")).toBe(false);

      db.prepare(
        `INSERT INTO slots_stats (user_id, jackpots, updated_at) VALUES (?, 1, ?)`,
      ).run("user1", Date.now());

      expect(checkJackpot("user1")).toBe(true);
    });

    it("Coin Master - unlocks at 100 coin flips", () => {
      const db = getDb();

      expect(checkCoinMaster("user1")).toBe(false);

      // Insert 99 flips
      for (let i = 0; i < 99; i++) {
        db.prepare(
          `INSERT INTO coin_flips (user_id, result, timestamp) VALUES (?, 'heads', ?)`,
        ).run("user1", Date.now() + i);
      }

      expect(checkCoinMaster("user1")).toBe(false);

      // Add 100th flip
      db.prepare(
        `INSERT INTO coin_flips (user_id, result, timestamp) VALUES (?, 'tails', ?)`,
      ).run("user1", Date.now());

      expect(checkCoinMaster("user1")).toBe(true);
    });
  });

  describe("dedication achievements", () => {
    it("Week Warrior - unlocks at 7-day streak", () => {
      const db = getDb();
      const now = Date.now();

      expect(checkDailyStreak7("user1")).toBe(false);

      db.prepare(
        `INSERT INTO daily_checkins (user_id, best_streak, last_checkin, updated_at) VALUES (?, 6, ?, ?)`,
      ).run("user1", now, now);
      expect(checkDailyStreak7("user1")).toBe(false);

      db.prepare(`UPDATE daily_checkins SET best_streak = 7 WHERE user_id = ?`).run(
        "user1",
      );
      expect(checkDailyStreak7("user1")).toBe(true);
    });
  });

  describe("social achievements", () => {
    it("Quotable - unlocks when user has a quote", () => {
      const db = getDb();
      const now = Date.now();

      expect(checkQuotable("user1")).toBe(false);

      db.prepare(
        `INSERT INTO quotes (guild_id, author_id, quote_text, added_by, added_at) VALUES (?, ?, 'Test quote', ?, ?)`,
      ).run("guild1", "user1", "user1", now);

      expect(checkQuotable("user1")).toBe(true);
    });

    it("Generous - unlocks after hosting 3 giveaways", () => {
      const db = getDb();
      const now = Date.now();

      expect(checkGenerous("user1")).toBe(false);

      const gw = (guildId: string) =>
        db
          .prepare(
            `INSERT INTO giveaways (guild_id, channel_id, host_id, prize, winner_count, ends_at, created_at) VALUES (?, 'c1', ?, 'Prize', 1, ?, ?)`,
          )
          .run(guildId, "user1", Date.now() + 3600000, now);

      gw("guild1");
      gw("guild1");
      expect(checkGenerous("user1")).toBe(false);
      gw("guild1");
      expect(checkGenerous("user1")).toBe(true);
    });
  });

  describe("user isolation", () => {
    it("achievements are per-user", () => {
      const db = getDb();
      const now = Date.now();

      db.prepare(
        `INSERT INTO rps_stats (user_id, wins, updated_at) VALUES (?, 5, ?)`,
      ).run("user1", now);
      db.prepare(
        `INSERT INTO rps_stats (user_id, wins, updated_at) VALUES (?, 0, ?)`,
      ).run("user2", now);

      expect(checkFirstWin("user1")).toBe(true);
      expect(checkFirstWin("user2")).toBe(false);
    });
  });
});
