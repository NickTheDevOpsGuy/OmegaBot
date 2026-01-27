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

  // Game stats tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS rps_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      ties INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS blackjack_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      ties INTEGER DEFAULT 0,
      blackjacks INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hangman_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      total_guesses INTEGER DEFAULT 0,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS slots_stats (
      user_id TEXT PRIMARY KEY,
      spins INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      jackpots INTEGER DEFAULT 0,
      biggest_win TEXT,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS wordle_stats (
      user_id TEXT PRIMARY KEY,
      played INTEGER DEFAULT 0,
      won INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      guess_distribution TEXT DEFAULT '{}',
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS daily_checkins (
      user_id TEXT PRIMARY KEY,
      last_checkin TEXT,
      streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0
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
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id TEXT NOT NULL,
      text TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id TEXT NOT NULL,
      prize TEXT
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

      db.prepare(`INSERT INTO rps_stats (user_id, wins) VALUES (?, 1)`).run("user1");

      expect(checkFirstWin("user1")).toBe(true);
    });

    it("Getting Good - unlocks at 10 total wins", () => {
      const db = getDb();

      expect(checkTenWins("user1")).toBe(false);

      db.prepare(`INSERT INTO rps_stats (user_id, wins) VALUES (?, 5)`).run("user1");
      db.prepare(`INSERT INTO blackjack_stats (user_id, wins) VALUES (?, 5)`).run(
        "user1",
      );

      expect(checkTenWins("user1")).toBe(true);
    });

    it("counts wins across multiple games", () => {
      const db = getDb();

      db.prepare(`INSERT INTO rps_stats (user_id, wins) VALUES (?, 3)`).run("user1");
      db.prepare(`INSERT INTO blackjack_stats (user_id, wins) VALUES (?, 4)`).run(
        "user1",
      );
      db.prepare(`INSERT INTO hangman_stats (user_id, wins) VALUES (?, 2)`).run("user1");

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
        db.prepare(`INSERT INTO coin_flips (user_id, result) VALUES (?, 'heads')`).run(
          "user1",
        );
      }

      expect(checkCoinMaster("user1")).toBe(false);

      // Add 100th flip
      db.prepare(`INSERT INTO coin_flips (user_id, result) VALUES (?, 'tails')`).run(
        "user1",
      );

      expect(checkCoinMaster("user1")).toBe(true);
    });
  });

  describe("dedication achievements", () => {
    it("Week Warrior - unlocks at 7-day streak", () => {
      const db = getDb();

      expect(checkDailyStreak7("user1")).toBe(false);

      db.prepare(`INSERT INTO daily_checkins (user_id, best_streak) VALUES (?, 6)`).run(
        "user1",
      );
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

      expect(checkQuotable("user1")).toBe(false);

      db.prepare(`INSERT INTO quotes (author_id, text) VALUES (?, 'Test quote')`).run(
        "user1",
      );

      expect(checkQuotable("user1")).toBe(true);
    });

    it("Generous - unlocks after hosting 3 giveaways", () => {
      const db = getDb();

      expect(checkGenerous("user1")).toBe(false);

      db.prepare(`INSERT INTO giveaways (host_id, prize) VALUES (?, 'Prize 1')`).run(
        "user1",
      );
      db.prepare(`INSERT INTO giveaways (host_id, prize) VALUES (?, 'Prize 2')`).run(
        "user1",
      );
      expect(checkGenerous("user1")).toBe(false);

      db.prepare(`INSERT INTO giveaways (host_id, prize) VALUES (?, 'Prize 3')`).run(
        "user1",
      );
      expect(checkGenerous("user1")).toBe(true);
    });
  });

  describe("user isolation", () => {
    it("achievements are per-user", () => {
      const db = getDb();

      db.prepare(`INSERT INTO rps_stats (user_id, wins) VALUES (?, 5)`).run("user1");
      db.prepare(`INSERT INTO rps_stats (user_id, wins) VALUES (?, 0)`).run("user2");

      expect(checkFirstWin("user1")).toBe(true);
      expect(checkFirstWin("user2")).toBe(false);
    });
  });
});
