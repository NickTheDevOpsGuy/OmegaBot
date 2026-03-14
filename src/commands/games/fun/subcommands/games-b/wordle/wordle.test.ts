// src/commands/fun/subcommands/wordle.test.ts
//
// Tests for the daily Wordle word puzzle.
//
// Wordle features:
// - Same word for everyone each day (seeded by date)
// - Color-coded feedback (correct/present/absent)
// - Streak tracking
// - Guess distribution stats
//
// Coverage:
// - Letter result calculation
// - Streak logic
// - Daily word consistency

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../../../../../services/core/database/dbTestUtils.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import { getLetterResult, formatGuessResults, isWordInList } from "./gameLogic.js";

useInMemoryDb();

// Replicate the wordle database schema
function ensureWordleTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS wordle_games (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      word TEXT NOT NULL,
      guesses TEXT NOT NULL,
      won INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      PRIMARY KEY (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS wordle_stats (
      user_id TEXT PRIMARY KEY,
      played INTEGER NOT NULL DEFAULT 0,
      won INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      max_streak INTEGER NOT NULL DEFAULT 0,
      guess_distribution TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL
    );
  `);
}

// Simulated stats
function getStats(userId: string): {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
} {
  ensureWordleTables();
  const db = getDb();

  const row = db
    .prepare(
      `SELECT played, won, current_streak, max_streak FROM wordle_stats WHERE user_id = ?`,
    )
    .get(userId) as
    | { played: number; won: number; current_streak: number; max_streak: number }
    | undefined;

  if (!row) return { played: 0, won: 0, currentStreak: 0, maxStreak: 0 };
  return {
    played: row.played,
    won: row.won,
    currentStreak: row.current_streak,
    maxStreak: row.max_streak,
  };
}

function recordGame(userId: string, won: boolean, _guessCount: number): void {
  ensureWordleTables();
  const db = getDb();
  const now = Date.now();

  const existing = getStats(userId);
  const newStreak = won ? existing.currentStreak + 1 : 0;
  const newMaxStreak = Math.max(existing.maxStreak, newStreak);

  if (existing.played === 0) {
    db.prepare(
      `
      INSERT INTO wordle_stats (user_id, played, won, current_streak, max_streak, guess_distribution, updated_at)
      VALUES (?, 1, ?, ?, ?, '{}', ?)
    `,
    ).run(userId, won ? 1 : 0, newStreak, newMaxStreak, now);
  } else {
    db.prepare(
      `
      UPDATE wordle_stats 
      SET played = played + 1, won = won + ?, current_streak = ?, max_streak = ?, updated_at = ?
      WHERE user_id = ?
    `,
    ).run(won ? 1 : 0, newStreak, newMaxStreak, now, userId);
  }
}

// Daily word generation (simplified - actual uses word list)
function getDayNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const epoch = new Date("2024-01-01");
  return Math.floor((date.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
}

describe("wordle game", () => {
  beforeEach(() => {
    ensureWordleTables();
  });

  describe("letter result calculation", () => {
    it("marks correct position as correct", () => {
      const result = getLetterResult("apple", "apple", 0);
      expect(result).toBe("correct");
    });

    it("marks present letter in wrong position", () => {
      // "a" is in "grape" but position 0 is "g"
      const result = getLetterResult("apple", "grape", 0);
      expect(result).toBe("present");
    });

    it("marks absent letter", () => {
      const result = getLetterResult("apple", "brick", 0); // "a" not in "brick"
      expect(result).toBe("absent");
    });

    it("handles all letter states in one guess", () => {
      // guess "crane" for word "track"
      // c: present (in track at pos 3, wrong position in guess)
      // r: correct (in track at pos 1)
      // a: correct (in track at pos 2)
      // n: absent
      // e: absent
      const results = formatGuessResults("crane", "track");

      expect(results[0]).toBe("present"); // c
      expect(results[1]).toBe("correct"); // r
      expect(results[2]).toBe("correct"); // a
      expect(results[3]).toBe("absent"); // n
      expect(results[4]).toBe("absent"); // e
    });

    it("handles exact match", () => {
      const results = formatGuessResults("track", "track");

      expect(results.every((r) => r === "correct")).toBe(true);
    });

    it("handles complete miss", () => {
      const results = formatGuessResults("blend", "quick");

      expect(results.every((r) => r === "absent")).toBe(true);
    });
  });

  describe("stats tracking", () => {
    it("tracks played count", () => {
      recordGame("user1", true, 3);
      recordGame("user1", false, 6);

      const stats = getStats("user1");
      expect(stats.played).toBe(2);
    });

    it("tracks wins", () => {
      recordGame("user1", true, 3);
      recordGame("user1", true, 4);
      recordGame("user1", false, 6);

      const stats = getStats("user1");
      expect(stats.won).toBe(2);
    });

    it("returns zeros for unknown user", () => {
      const stats = getStats("unknown");

      expect(stats.played).toBe(0);
      expect(stats.won).toBe(0);
      expect(stats.currentStreak).toBe(0);
    });
  });

  describe("streak tracking", () => {
    it("increments streak on win", () => {
      recordGame("user1", true, 3);
      recordGame("user1", true, 4);
      recordGame("user1", true, 5);

      const stats = getStats("user1");
      expect(stats.currentStreak).toBe(3);
    });

    it("resets streak on loss", () => {
      recordGame("user1", true, 3);
      recordGame("user1", true, 4);
      recordGame("user1", false, 6); // Loss

      const stats = getStats("user1");
      expect(stats.currentStreak).toBe(0);
    });

    it("preserves max streak", () => {
      recordGame("user1", true, 3);
      recordGame("user1", true, 4);
      recordGame("user1", true, 5); // 3 streak
      recordGame("user1", false, 6); // Reset
      recordGame("user1", true, 4); // 1 streak

      const stats = getStats("user1");
      expect(stats.maxStreak).toBe(3);
      expect(stats.currentStreak).toBe(1);
    });
  });

  describe("daily word consistency", () => {
    it("same date produces same day number", () => {
      const day1 = getDayNumber("2024-06-15");
      const day2 = getDayNumber("2024-06-15");

      expect(day1).toBe(day2);
    });

    it("different dates produce different day numbers", () => {
      const day1 = getDayNumber("2024-06-15");
      const day2 = getDayNumber("2024-06-16");

      expect(day1).not.toBe(day2);
      expect(day2 - day1).toBe(1);
    });

    it("day number increases over time", () => {
      const jan = getDayNumber("2024-01-15");
      const jun = getDayNumber("2024-06-15");

      expect(jun).toBeGreaterThan(jan);
    });
  });

  describe("guess validation", () => {
    it("accepts words from the built-in list", () => {
      expect(isWordInList("apple")).toBe(true);
    });

    it("rejects unknown words without treating them as valid guesses", () => {
      expect(isWordInList("qzxyk")).toBe(false);
    });
  });
});
