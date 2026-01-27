// src/commands/fun/subcommands/daily.test.ts
//
// Tests for the daily check-in system.
//
// The daily command awards points and tracks streaks.
// Users can only check in once per day (UTC).
//
// Coverage:
// - First check-in
// - Consecutive day streaks
// - Streak reset after missed day
// - Duplicate check-in prevention

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../../test/dbTestUtils.js";
import { getDb } from "../../../services/database/db.js";

useInMemoryDb();

// Helper to set up daily_checkins table
function ensureDailyTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_checkins (
      user_id TEXT PRIMARY KEY,
      last_checkin TEXT,
      streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0
    )
  `);
}

// Simulated check-in logic (mirrors daily.ts)
function performCheckin(
  userId: string,
  todayStr: string,
): { points: number; streak: number; isNew: boolean } {
  const db = getDb();
  ensureDailyTable();

  const row = db.prepare(`SELECT * FROM daily_checkins WHERE user_id = ?`).get(userId) as
    | {
        last_checkin: string | null;
        streak: number;
        best_streak: number;
        points: number;
      }
    | undefined;

  if (!row) {
    // First check-in ever
    db.prepare(
      `
      INSERT INTO daily_checkins (user_id, last_checkin, streak, best_streak, points)
      VALUES (?, ?, 1, 1, 10)
    `,
    ).run(userId, todayStr);
    return { points: 10, streak: 1, isNew: true };
  }

  if (row.last_checkin === todayStr) {
    // Already checked in today
    return { points: 0, streak: row.streak, isNew: false };
  }

  // Calculate new streak
  const lastDate = new Date(row.last_checkin || "1970-01-01");
  const today = new Date(todayStr);
  const diffDays = Math.floor(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  let newStreak: number;
  if (diffDays === 1) {
    // Consecutive day
    newStreak = row.streak + 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  const bonusPoints = Math.min(newStreak, 7) * 5; // 5-35 bonus based on streak
  const totalPoints = 10 + bonusPoints;
  const newBest = Math.max(row.best_streak, newStreak);

  db.prepare(
    `
    UPDATE daily_checkins 
    SET last_checkin = ?, streak = ?, best_streak = ?, points = points + ?
    WHERE user_id = ?
  `,
  ).run(todayStr, newStreak, newBest, totalPoints, userId);

  return { points: totalPoints, streak: newStreak, isNew: true };
}

describe("daily check-in", () => {
  beforeEach(() => {
    ensureDailyTable();
  });

  describe("first check-in", () => {
    it("awards base points on first check-in", () => {
      const result = performCheckin("user1", "2024-01-15");

      expect(result.isNew).toBe(true);
      expect(result.points).toBe(10);
      expect(result.streak).toBe(1);
    });

    it("creates record in database", () => {
      performCheckin("user1", "2024-01-15");

      const db = getDb();
      const row = db
        .prepare(`SELECT * FROM daily_checkins WHERE user_id = ?`)
        .get("user1") as {
        streak: number;
        points: number;
      };

      expect(row).toBeDefined();
      expect(row.streak).toBe(1);
      expect(row.points).toBe(10);
    });
  });

  describe("streak tracking", () => {
    it("increments streak on consecutive days", () => {
      performCheckin("user1", "2024-01-15");
      const result = performCheckin("user1", "2024-01-16");

      expect(result.streak).toBe(2);
      expect(result.isNew).toBe(true);
    });

    it("awards bonus points for streaks", () => {
      performCheckin("user1", "2024-01-15"); // 10 points
      const day2 = performCheckin("user1", "2024-01-16"); // 10 + 10 bonus

      expect(day2.points).toBe(20); // 10 base + 10 (2-day streak bonus)
    });

    it("resets streak after missed day", () => {
      performCheckin("user1", "2024-01-15");
      performCheckin("user1", "2024-01-16");
      // Skip a day
      const result = performCheckin("user1", "2024-01-18");

      expect(result.streak).toBe(1); // Reset to 1
    });

    it("preserves best streak", () => {
      performCheckin("user1", "2024-01-15");
      performCheckin("user1", "2024-01-16");
      performCheckin("user1", "2024-01-17"); // 3-day streak
      performCheckin("user1", "2024-01-20"); // Reset

      const db = getDb();
      const row = db
        .prepare(`SELECT best_streak FROM daily_checkins WHERE user_id = ?`)
        .get("user1") as {
        best_streak: number;
      };

      expect(row.best_streak).toBe(3);
    });
  });

  describe("duplicate prevention", () => {
    it("prevents multiple check-ins same day", () => {
      performCheckin("user1", "2024-01-15");
      const duplicate = performCheckin("user1", "2024-01-15");

      expect(duplicate.isNew).toBe(false);
      expect(duplicate.points).toBe(0);
    });

    it("does not increment streak on duplicate", () => {
      performCheckin("user1", "2024-01-15");
      performCheckin("user1", "2024-01-15");

      const db = getDb();
      const row = db
        .prepare(`SELECT streak FROM daily_checkins WHERE user_id = ?`)
        .get("user1") as {
        streak: number;
      };

      expect(row.streak).toBe(1);
    });
  });
});
