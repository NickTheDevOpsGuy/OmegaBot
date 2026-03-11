// src/commands/fun/subcommands/slots.test.ts
//
// Tests for the slot machine game.
//
// The slots game uses weighted random selection for symbols.
// Three matching symbols pay out based on the symbol's payout multiplier.
// Two adjacent matching symbols pay 2x.
//
// Coverage:
// - Stats tracking (spins, wins, jackpots)
// - Payout calculation
// - Leaderboard

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../../../../../services/core/database/dbTestUtils.js";
import { getDb } from "../../../../../../services/core/database/db.js";

useInMemoryDb();

// Replicate the slots database schema
function ensureSlotsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS slots_stats (
      user_id TEXT PRIMARY KEY,
      spins INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      jackpots INTEGER NOT NULL DEFAULT 0,
      biggest_win TEXT,
      updated_at INTEGER NOT NULL
    );
  `);
}

// Simulated stats functions
function getStats(userId: string): {
  spins: number;
  wins: number;
  jackpots: number;
  biggestWin: string | null;
} {
  ensureSlotsTable();
  const db = getDb();

  const row = db
    .prepare(
      `SELECT spins, wins, jackpots, biggest_win FROM slots_stats WHERE user_id = ?`,
    )
    .get(userId) as
    | { spins: number; wins: number; jackpots: number; biggest_win: string | null }
    | undefined;

  if (!row) return { spins: 0, wins: 0, jackpots: 0, biggestWin: null };
  return {
    spins: row.spins,
    wins: row.wins,
    jackpots: row.jackpots,
    biggestWin: row.biggest_win,
  };
}

function recordSpin(
  userId: string,
  isWin: boolean,
  isJackpot: boolean,
  payout: number,
): void {
  ensureSlotsTable();
  const db = getDb();
  const now = Date.now();

  const existing = getStats(userId);
  const newBiggest =
    payout > 0 && (!existing.biggestWin || payout > parseInt(existing.biggestWin))
      ? String(payout)
      : existing.biggestWin;

  if (existing.spins === 0) {
    db.prepare(
      `
      INSERT INTO slots_stats (user_id, spins, wins, jackpots, biggest_win, updated_at)
      VALUES (?, 1, ?, ?, ?, ?)
    `,
    ).run(userId, isWin ? 1 : 0, isJackpot ? 1 : 0, newBiggest, now);
  } else {
    db.prepare(
      `
      UPDATE slots_stats 
      SET spins = spins + 1, 
          wins = wins + ?, 
          jackpots = jackpots + ?, 
          biggest_win = ?,
          updated_at = ?
      WHERE user_id = ?
    `,
    ).run(isWin ? 1 : 0, isJackpot ? 1 : 0, newBiggest, now, userId);
  }
}

function getJackpotLeaderboard(
  limit: number,
): Array<{ userId: string; jackpots: number }> {
  ensureSlotsTable();
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT user_id, jackpots FROM slots_stats WHERE jackpots > 0 ORDER BY jackpots DESC LIMIT ?`,
    )
    .all(limit) as Array<{ user_id: string; jackpots: number }>;

  return rows.map((r) => ({ userId: r.user_id, jackpots: r.jackpots }));
}

// Payout calculation (from actual implementation)
type Symbol = { emoji: string; name: string; payout: number };

function calculatePayout(reels: Symbol[]): { payout: number; type: string } {
  const [a, b, c] = reels;

  // Three of a kind
  if (a.emoji === b.emoji && b.emoji === c.emoji) {
    const isJackpot = a.emoji === "💎";
    return {
      payout: a.payout,
      type: isJackpot ? "💎 JACKPOT!" : `Three ${a.name}s!`,
    };
  }

  // Two of a kind (adjacent)
  if (a.emoji === b.emoji) return { payout: 2, type: `Two ${a.name}s` };
  if (b.emoji === c.emoji) return { payout: 2, type: `Two ${b.name}s` };

  return { payout: 0, type: "No match" };
}

describe("slots game", () => {
  beforeEach(() => {
    ensureSlotsTable();
  });

  describe("stats tracking", () => {
    it("tracks spins for new user", () => {
      recordSpin("user1", false, false, 0);
      const stats = getStats("user1");

      expect(stats.spins).toBe(1);
      expect(stats.wins).toBe(0);
    });

    it("tracks wins", () => {
      recordSpin("user1", true, false, 10);
      const stats = getStats("user1");

      expect(stats.wins).toBe(1);
    });

    it("tracks jackpots separately", () => {
      recordSpin("user1", true, true, 100);
      const stats = getStats("user1");

      expect(stats.jackpots).toBe(1);
      expect(stats.wins).toBe(1);
    });

    it("accumulates across multiple spins", () => {
      recordSpin("user1", false, false, 0);
      recordSpin("user1", true, false, 5);
      recordSpin("user1", true, true, 100);
      recordSpin("user1", false, false, 0);

      const stats = getStats("user1");

      expect(stats.spins).toBe(4);
      expect(stats.wins).toBe(2);
      expect(stats.jackpots).toBe(1);
    });

    it("tracks biggest win", () => {
      recordSpin("user1", true, false, 10);
      recordSpin("user1", true, false, 50);
      recordSpin("user1", true, false, 25);

      const stats = getStats("user1");

      expect(stats.biggestWin).toBe("50");
    });

    it("returns zeros for unknown user", () => {
      const stats = getStats("unknown");

      expect(stats.spins).toBe(0);
      expect(stats.wins).toBe(0);
      expect(stats.jackpots).toBe(0);
      expect(stats.biggestWin).toBeNull();
    });
  });

  describe("leaderboard", () => {
    it("returns empty when no jackpots", () => {
      recordSpin("user1", true, false, 10);
      const leaderboard = getJackpotLeaderboard(10);

      expect(leaderboard).toEqual([]);
    });

    it("ranks by jackpot count", () => {
      recordSpin("user1", true, true, 100);
      recordSpin("user2", true, true, 100);
      recordSpin("user2", true, true, 100);
      recordSpin("user3", true, true, 100);
      recordSpin("user3", true, true, 100);
      recordSpin("user3", true, true, 100);

      const leaderboard = getJackpotLeaderboard(10);

      expect(leaderboard[0].userId).toBe("user3");
      expect(leaderboard[0].jackpots).toBe(3);
      expect(leaderboard[1].userId).toBe("user2");
      expect(leaderboard[2].userId).toBe("user1");
    });
  });

  describe("payout calculation", () => {
    const cherry = { emoji: "🍒", name: "Cherry", payout: 3 };
    const seven = { emoji: "7️⃣", name: "Seven", payout: 15 };
    const diamond = { emoji: "💎", name: "Diamond", payout: 100 };
    const lemon = { emoji: "🍋", name: "Lemon", payout: 2 };

    it("pays for three of a kind", () => {
      const result = calculatePayout([cherry, cherry, cherry]);

      expect(result.payout).toBe(3);
      expect(result.type).toBe("Three Cherrys!");
    });

    it("identifies jackpot (three diamonds)", () => {
      const result = calculatePayout([diamond, diamond, diamond]);

      expect(result.payout).toBe(100);
      expect(result.type).toBe("💎 JACKPOT!");
    });

    it("pays 2x for two adjacent (first two)", () => {
      const result = calculatePayout([cherry, cherry, lemon]);

      expect(result.payout).toBe(2);
      expect(result.type).toBe("Two Cherrys");
    });

    it("pays 2x for two adjacent (last two)", () => {
      const result = calculatePayout([lemon, seven, seven]);

      expect(result.payout).toBe(2);
      expect(result.type).toBe("Two Sevens");
    });

    it("returns 0 for no match", () => {
      const result = calculatePayout([cherry, seven, lemon]);

      expect(result.payout).toBe(0);
      expect(result.type).toBe("No match");
    });

    it("does not pay for non-adjacent pairs", () => {
      const result = calculatePayout([cherry, lemon, cherry]);

      expect(result.payout).toBe(0);
    });
  });
});
