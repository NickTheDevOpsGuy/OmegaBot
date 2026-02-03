// src/commands/fun/subcommands/daily.test.ts
//
// Tests for the daily check-in system.
//
// Uses the real doCheckIn from daily.ts with vi.useFakeTimers() for date control.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { useInMemoryDb } from "../../../test/dbTestUtils.js";
import { getDb } from "../../../services/database/db.js";
import { doCheckIn } from "./daily.js";

useInMemoryDb();

function getStatsFromDb(userId: string): {
  streak: number;
  points: number;
  best_streak: number;
} | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT streak, points, best_streak FROM daily_checkins WHERE user_id = ?`)
    .get(userId) as { streak: number; points: number; best_streak: number } | undefined;
  return row ?? null;
}

describe("daily check-in", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  describe("first check-in", () => {
    it("awards base points on first check-in", () => {
      const result = doCheckIn("user1");

      expect(result.isNewBest).toBe(true);
      expect(result.points).toBe(12); // 10 base + 2 streak bonus (streak*2)
      expect(result.streak).toBe(1);
    });

    it("creates record in database", () => {
      doCheckIn("user1");

      const row = getStatsFromDb("user1");
      expect(row).toBeDefined();
      expect(row!.streak).toBe(1);
      expect(row!.points).toBe(12);
    });
  });

  describe("streak tracking", () => {
    it("increments streak on consecutive days", () => {
      doCheckIn("user1");
      vi.setSystemTime(new Date("2024-01-16T12:00:00Z"));
      const result = doCheckIn("user1");

      expect(result.streak).toBe(2);
      expect(result.isNewBest).toBe(true);
    });

    it("awards bonus points for streaks", () => {
      doCheckIn("user1"); // 12 points (10 + 2)
      vi.setSystemTime(new Date("2024-01-16T12:00:00Z"));
      const day2 = doCheckIn("user1"); // 14 points (10 + 4 for 2-day streak)

      expect(day2.points).toBe(14);
    });

    it("resets streak after missed day", () => {
      doCheckIn("user1");
      vi.setSystemTime(new Date("2024-01-16T12:00:00Z"));
      doCheckIn("user1");
      vi.setSystemTime(new Date("2024-01-19T12:00:00Z")); // >48h gap, streak breaks
      const result = doCheckIn("user1");

      expect(result.streak).toBe(1);
    });

    it("preserves best streak", () => {
      doCheckIn("user1");
      vi.setSystemTime(new Date("2024-01-16T12:00:00Z"));
      doCheckIn("user1");
      vi.setSystemTime(new Date("2024-01-17T12:00:00Z"));
      doCheckIn("user1"); // 3-day streak
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z")); // Reset
      doCheckIn("user1");

      const row = getStatsFromDb("user1");
      expect(row!.best_streak).toBe(3);
    });
  });

  describe("duplicate prevention", () => {
    it("prevents multiple check-ins same day", () => {
      doCheckIn("user1");
      expect(() => doCheckIn("user1")).toThrow("Already checked in today");
    });

    it("does not increment streak on duplicate", () => {
      doCheckIn("user1");
      try {
        doCheckIn("user1");
      } catch {
        // Expected to throw
      }

      const row = getStatsFromDb("user1");
      expect(row!.streak).toBe(1);
    });
  });
});
