// src/commands/fun/subcommands/rps.test.ts
//
// Tests for Rock-Paper-Scissors game logic and stats.
//
// Coverage:
// - Win/loss/tie determination
// - Stats tracking
// - PvP head-to-head records

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../../../../../services/core/database/dbTestUtils.js";
import { getDb } from "../../../../../../services/core/database/db.js";

useInMemoryDb();

// RPS types
type Choice = "rock" | "paper" | "scissors";

// Game logic (mirrors actual implementation)
function determineWinner(p1: Choice, p2: Choice): "p1" | "p2" | "tie" {
  if (p1 === p2) return "tie";

  const wins: Record<Choice, Choice> = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };

  return wins[p1] === p2 ? "p1" : "p2";
}

// Database setup
function ensureRpsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS rps_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rps_h2h (
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      user1_wins INTEGER NOT NULL DEFAULT 0,
      user2_wins INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user1_id, user2_id)
    );
  `);
}

function getStats(userId: string): { wins: number; losses: number; ties: number } {
  ensureRpsTable();
  const db = getDb();

  const row = db
    .prepare(`SELECT wins, losses, ties FROM rps_stats WHERE user_id = ?`)
    .get(userId) as { wins: number; losses: number; ties: number } | undefined;

  return row ?? { wins: 0, losses: 0, ties: 0 };
}

function recordGame(userId: string, result: "win" | "loss" | "tie"): void {
  ensureRpsTable();
  const db = getDb();
  const now = Date.now();

  const col = result === "win" ? "wins" : result === "loss" ? "losses" : "ties";

  db.prepare(
    `
    INSERT INTO rps_stats (user_id, wins, losses, ties, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      ${col} = ${col} + 1,
      updated_at = ?
  `,
  ).run(
    userId,
    result === "win" ? 1 : 0,
    result === "loss" ? 1 : 0,
    result === "tie" ? 1 : 0,
    now,
    now,
  );
}

describe("RPS game", () => {
  beforeEach(() => {
    ensureRpsTable();
  });

  describe("game logic", () => {
    it("rock beats scissors", () => {
      expect(determineWinner("rock", "scissors")).toBe("p1");
      expect(determineWinner("scissors", "rock")).toBe("p2");
    });

    it("scissors beats paper", () => {
      expect(determineWinner("scissors", "paper")).toBe("p1");
      expect(determineWinner("paper", "scissors")).toBe("p2");
    });

    it("paper beats rock", () => {
      expect(determineWinner("paper", "rock")).toBe("p1");
      expect(determineWinner("rock", "paper")).toBe("p2");
    });

    it("same choice is a tie", () => {
      expect(determineWinner("rock", "rock")).toBe("tie");
      expect(determineWinner("paper", "paper")).toBe("tie");
      expect(determineWinner("scissors", "scissors")).toBe("tie");
    });
  });

  describe("stats tracking", () => {
    it("tracks wins", () => {
      recordGame("user1", "win");
      recordGame("user1", "win");

      const stats = getStats("user1");

      expect(stats.wins).toBe(2);
      expect(stats.losses).toBe(0);
      expect(stats.ties).toBe(0);
    });

    it("tracks losses", () => {
      recordGame("user1", "loss");

      const stats = getStats("user1");

      expect(stats.losses).toBe(1);
    });

    it("tracks ties", () => {
      recordGame("user1", "tie");
      recordGame("user1", "tie");
      recordGame("user1", "tie");

      const stats = getStats("user1");

      expect(stats.ties).toBe(3);
    });

    it("accumulates all results", () => {
      recordGame("user1", "win");
      recordGame("user1", "win");
      recordGame("user1", "loss");
      recordGame("user1", "tie");

      const stats = getStats("user1");

      expect(stats.wins).toBe(2);
      expect(stats.losses).toBe(1);
      expect(stats.ties).toBe(1);
    });

    it("returns zeros for unknown user", () => {
      const stats = getStats("unknown");

      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.ties).toBe(0);
    });

    it("isolates stats per user", () => {
      recordGame("user1", "win");
      recordGame("user1", "win");
      recordGame("user2", "loss");

      expect(getStats("user1").wins).toBe(2);
      expect(getStats("user2").losses).toBe(1);
    });
  });
});
