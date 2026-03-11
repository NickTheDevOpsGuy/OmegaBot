// src/commands/fun/coinflipStore.test.ts
//
// Tests for the coinflip persistence layer.
//
// Coverage:
// - Recording flips
// - Retrieving totals
// - Recent flip history
// - Leaderboard

import { describe, expect, it } from "vitest";
import { useInMemoryDb } from "../../../services/core/database/dbTestUtils.js";
import {
  recordCoinFlip,
  getCoinFlipTotals,
  getRecentCoinFlips,
  getCoinFlipLeaderboard,
} from "./coinflipStore.js";

useInMemoryDb();

describe("coinflipStore", () => {
  describe("recordCoinFlip", () => {
    it("records a heads flip", () => {
      recordCoinFlip({ userId: "user1", result: "heads" });

      const totals = getCoinFlipTotals("user1");
      expect(totals.heads).toBe(1);
      expect(totals.tails).toBe(0);
      expect(totals.total).toBe(1);
    });

    it("records a tails flip", () => {
      recordCoinFlip({ userId: "user1", result: "tails" });

      const totals = getCoinFlipTotals("user1");
      expect(totals.heads).toBe(0);
      expect(totals.tails).toBe(1);
      expect(totals.total).toBe(1);
    });

    it("accumulates multiple flips", () => {
      recordCoinFlip({ userId: "user1", result: "heads" });
      recordCoinFlip({ userId: "user1", result: "heads" });
      recordCoinFlip({ userId: "user1", result: "tails" });

      const totals = getCoinFlipTotals("user1");
      expect(totals.heads).toBe(2);
      expect(totals.tails).toBe(1);
      expect(totals.total).toBe(3);
    });
  });

  describe("getCoinFlipTotals", () => {
    it("returns zeros for unknown user", () => {
      const totals = getCoinFlipTotals("unknown-user");

      expect(totals.heads).toBe(0);
      expect(totals.tails).toBe(0);
      expect(totals.total).toBe(0);
    });

    it("isolates totals per user", () => {
      recordCoinFlip({ userId: "user1", result: "heads" });
      recordCoinFlip({ userId: "user2", result: "tails" });
      recordCoinFlip({ userId: "user2", result: "tails" });

      expect(getCoinFlipTotals("user1").total).toBe(1);
      expect(getCoinFlipTotals("user2").total).toBe(2);
    });
  });

  describe("getRecentCoinFlips", () => {
    it("returns empty array for unknown user", () => {
      const recent = getRecentCoinFlips("unknown", 10);
      expect(recent).toEqual([]);
    });

    it("returns flips in reverse chronological order", () => {
      recordCoinFlip({ userId: "user1", result: "heads", timestamp: 1000 });
      recordCoinFlip({ userId: "user1", result: "tails", timestamp: 2000 });
      recordCoinFlip({ userId: "user1", result: "heads", timestamp: 3000 });

      const recent = getRecentCoinFlips("user1", 10);

      expect(recent.length).toBe(3);
      expect(recent[0].result).toBe("heads"); // most recent
      expect(recent[0].timestamp).toBe(3000);
      expect(recent[2].result).toBe("heads"); // oldest
      expect(recent[2].timestamp).toBe(1000);
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        recordCoinFlip({ userId: "user1", result: "heads" });
      }

      const recent = getRecentCoinFlips("user1", 5);
      expect(recent.length).toBe(5);
    });

    it("clamps limit to valid range", () => {
      for (let i = 0; i < 30; i++) {
        recordCoinFlip({ userId: "user1", result: "heads" });
      }

      // Max is 25
      const recent = getRecentCoinFlips("user1", 100);
      expect(recent.length).toBe(25);
    });
  });

  describe("getCoinFlipLeaderboard", () => {
    it("returns empty array when no flips", () => {
      const leaderboard = getCoinFlipLeaderboard(10);
      expect(leaderboard).toEqual([]);
    });

    it("ranks users by total flips", () => {
      // user2 has most flips
      recordCoinFlip({ userId: "user1", result: "heads" });
      recordCoinFlip({ userId: "user2", result: "heads" });
      recordCoinFlip({ userId: "user2", result: "tails" });
      recordCoinFlip({ userId: "user2", result: "heads" });
      recordCoinFlip({ userId: "user3", result: "tails" });
      recordCoinFlip({ userId: "user3", result: "tails" });

      const leaderboard = getCoinFlipLeaderboard(10);

      expect(leaderboard.length).toBe(3);
      expect(leaderboard[0].userId).toBe("user2");
      expect(leaderboard[0].total).toBe(3);
      expect(leaderboard[1].userId).toBe("user3");
      expect(leaderboard[1].total).toBe(2);
      expect(leaderboard[2].userId).toBe("user1");
      expect(leaderboard[2].total).toBe(1);
    });
  });
});
