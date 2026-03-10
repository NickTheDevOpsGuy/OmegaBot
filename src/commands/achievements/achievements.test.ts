// src/commands/achievements/achievements.test.ts
// Game, luck, dedication achievements and user isolation.

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../test/dbTestUtils.js";
import { getDb } from "../../services/database/db.js";
import {
  setupTables,
  checkFirstWin,
  checkTenWins,
  checkJackpot,
  checkDailyStreak7,
  checkCoinMaster,
} from "./achievements.testHelpers.js";

useInMemoryDb();

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

      expect(checkTenWins("user1")).toBe(false);

      db.prepare(`UPDATE hangman_stats SET wins = 3 WHERE user_id = ?`).run(
        "user1",
      );
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

      for (let i = 0; i < 99; i++) {
        db.prepare(
          `INSERT INTO coin_flips (user_id, result, timestamp) VALUES (?, 'heads', ?)`,
        ).run("user1", Date.now() + i);
      }
      expect(checkCoinMaster("user1")).toBe(false);

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
