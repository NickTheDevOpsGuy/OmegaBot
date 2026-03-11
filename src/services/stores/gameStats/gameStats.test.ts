// src/services/gameStats/gameStats.test.ts
//
// Tests for shared game stats queries.
// Uses in-memory DB; initDatabase (from useInMemoryDb) creates schema.

import { describe, expect, it } from "vitest";
import { useInMemoryDb } from "../../core/database/dbTestUtils.js";
import { getDb } from "../../core/database/db.js";
import { getTotalWins, getTotalGamesPlayed, getScalar, getCount } from "./gameStats.js";

useInMemoryDb();

const now = () => Date.now();

describe("gameStats", () => {
  describe("getTotalWins", () => {
    it("sums wins across all game tables", () => {
      const db = getDb();
      db.prepare(
        "INSERT INTO rps_stats (user_id, wins, losses, ties, updated_at) VALUES (?, 3, 1, 0, ?)",
      ).run("u1", now());
      db.prepare(
        "INSERT INTO ttt_stats (user_id, wins, losses, ties, updated_at) VALUES (?, 2, 0, 1, ?)",
      ).run("u1", now());
      db.prepare(
        "INSERT INTO blackjack_stats (user_id, wins, losses, ties, blackjacks, updated_at) VALUES (?, 1, 0, 0, 0, ?)",
      ).run("u1", now());

      expect(getTotalWins(db, "u1")).toBe(6);
    });

    it("returns 0 for unknown user", () => {
      const db = getDb();
      expect(getTotalWins(db, "unknown")).toBe(0);
    });

    it("handles partial data", () => {
      const db = getDb();
      db.prepare(
        "INSERT INTO rps_stats (user_id, wins, losses, ties, updated_at) VALUES (?, 5, 0, 0, ?)",
      ).run("u1", now());
      expect(getTotalWins(db, "u1")).toBe(5);
    });
  });

  describe("getTotalGamesPlayed", () => {
    it("sums wins+losses+ties across tables", () => {
      const db = getDb();
      db.prepare(
        "INSERT INTO rps_stats (user_id, wins, losses, ties, updated_at) VALUES (?, 3, 2, 1, ?)",
      ).run("u1", now());
      db.prepare(
        "INSERT INTO hangman_stats (user_id, wins, losses, total_guesses, updated_at) VALUES (?, 1, 1, 0, ?)",
      ).run("u1", now());

      expect(getTotalGamesPlayed(db, "u1")).toBe(8);
    });

    it("returns 0 for unknown user", () => {
      const db = getDb();
      expect(getTotalGamesPlayed(db, "unknown")).toBe(0);
    });
  });

  describe("getScalar", () => {
    it("returns a single column value", () => {
      const db = getDb();
      db.prepare(
        "INSERT INTO blackjack_stats (user_id, wins, losses, ties, blackjacks, updated_at) VALUES (?, 0, 0, 0, 2, ?)",
      ).run("u1", now());

      expect(getScalar(db, "u1", "blackjack_stats", "blackjacks")).toBe(2);
    });

    it("returns 0 when user has no row", () => {
      const db = getDb();
      expect(getScalar(db, "unknown", "blackjack_stats", "blackjacks")).toBe(0);
    });

    it("returns 0 when table does not exist", () => {
      const db = getDb();
      expect(getScalar(db, "u1", "nonexistent_table", "col")).toBe(0);
    });
  });

  describe("getCount", () => {
    it("counts rows where column matches value", () => {
      const db = getDb();
      const t = now();
      db.prepare(
        "INSERT INTO coin_flips (user_id, result, timestamp) VALUES (?, 'heads', ?)",
      ).run("u1", t);
      db.prepare(
        "INSERT INTO coin_flips (user_id, result, timestamp) VALUES (?, 'tails', ?)",
      ).run("u1", t);
      db.prepare(
        "INSERT INTO coin_flips (user_id, result, timestamp) VALUES (?, 'heads', ?)",
      ).run("u1", t);

      expect(getCount(db, "coin_flips", "user_id", "u1")).toBe(3);
    });

    it("returns 0 when no matches", () => {
      const db = getDb();
      expect(getCount(db, "quotes", "author_id", "unknown")).toBe(0);
    });
  });
});
