// src/commands/fun/subcommands/tictactoeStore.test.ts
//
// Tests for Tic-Tac-Toe stats and head-to-head tracking.
//
// Coverage:
// - Win/loss/tie recording
// - Head-to-head records
// - Stats retrieval

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../../../../../services/core/database/dbTestUtils.js";
import {
  ensureTttTable,
  getStats,
  recordWin,
  recordTie,
  getH2H,
  recordH2HWin,
  recordH2HTie,
} from "./tictactoeStore.js";

useInMemoryDb();

describe("tictactoeStore", () => {
  beforeEach(() => {
    ensureTttTable();
  });

  describe("getStats", () => {
    it("returns zeros for new user", () => {
      const stats = getStats("new-user");

      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.ties).toBe(0);
      expect(stats.total).toBe(0);
      expect(stats.winRate).toBe(0);
    });
  });

  describe("recordWin", () => {
    it("increments winner wins and loser losses", () => {
      recordWin("winner", "loser");

      const winnerStats = getStats("winner");
      const loserStats = getStats("loser");

      expect(winnerStats.wins).toBe(1);
      expect(winnerStats.losses).toBe(0);
      expect(loserStats.wins).toBe(0);
      expect(loserStats.losses).toBe(1);
    });

    it("accumulates across multiple games", () => {
      recordWin("user1", "user2");
      recordWin("user1", "user2");
      recordWin("user2", "user1");

      const user1Stats = getStats("user1");
      const user2Stats = getStats("user2");

      expect(user1Stats.wins).toBe(2);
      expect(user1Stats.losses).toBe(1);
      expect(user2Stats.wins).toBe(1);
      expect(user2Stats.losses).toBe(2);
    });

    it("calculates win rate correctly", () => {
      recordWin("user1", "user2");
      recordWin("user1", "user2");
      recordWin("user1", "user2");
      recordWin("user2", "user1");

      const stats = getStats("user1");

      expect(stats.total).toBe(4);
      expect(stats.winRate).toBe(75); // 3/4
    });
  });

  describe("recordTie", () => {
    it("increments ties for both players", () => {
      recordTie("user1", "user2");

      expect(getStats("user1").ties).toBe(1);
      expect(getStats("user2").ties).toBe(1);
    });

    it("accumulates ties", () => {
      recordTie("user1", "user2");
      recordTie("user1", "user2");
      recordTie("user1", "user2");

      expect(getStats("user1").ties).toBe(3);
      expect(getStats("user2").ties).toBe(3);
    });
  });

  describe("head-to-head", () => {
    it("returns zeros for no history", () => {
      const h2h = getH2H("user1", "user2");

      expect(h2h.yourWins).toBe(0);
      expect(h2h.theirWins).toBe(0);
      expect(h2h.ties).toBe(0);
    });

    it("tracks wins from user perspective", () => {
      recordH2HWin("user1", "user2");
      recordH2HWin("user1", "user2");
      recordH2HWin("user2", "user1");

      const user1View = getH2H("user1", "user2");
      const user2View = getH2H("user2", "user1");

      expect(user1View.yourWins).toBe(2);
      expect(user1View.theirWins).toBe(1);

      expect(user2View.yourWins).toBe(1);
      expect(user2View.theirWins).toBe(2);
    });

    it("handles ID ordering consistently", () => {
      // Record from different "perspectives" - should use same DB row
      recordH2HWin("alice", "bob");
      recordH2HWin("bob", "alice");

      const aliceView = getH2H("alice", "bob");
      const bobView = getH2H("bob", "alice");

      expect(aliceView.yourWins).toBe(1);
      expect(aliceView.theirWins).toBe(1);
      expect(bobView.yourWins).toBe(1);
      expect(bobView.theirWins).toBe(1);
    });

    it("tracks ties in h2h", () => {
      recordH2HTie("user1", "user2");
      recordH2HTie("user1", "user2");

      const h2h = getH2H("user1", "user2");

      expect(h2h.ties).toBe(2);
    });
  });
});
