// src/commands/fun/subcommands/hangman/hangmanStats.test.ts
import { describe, expect, it } from "vitest";
import { useInMemoryDb } from "../../../../test/dbTestUtils.js";
import { getStats, recordResult } from "./hangmanStats.js";

useInMemoryDb();

describe("hangmanStats", () => {
  it("returns zeros for unknown user", () => {
    const stats = getStats("unknown-user");
    expect(stats).toEqual({
      wins: 0,
      losses: 0,
      totalGuesses: 0,
      winRate: 0,
      bestTimeSeconds: null,
      averageTimeSeconds: null,
    });
  });

  it("records a win and returns stats", () => {
    recordResult("user1", true, 5, 30);
    const stats = getStats("user1");
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.totalGuesses).toBe(5);
    expect(stats.winRate).toBe(100);
    expect(stats.bestTimeSeconds).toBe(30);
    expect(stats.averageTimeSeconds).toBe(30);
  });

  it("records a loss", () => {
    recordResult("user2", false, 8);
    const stats = getStats("user2");
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(1);
    expect(stats.totalGuesses).toBe(8);
    expect(stats.winRate).toBe(0);
    expect(stats.bestTimeSeconds).toBeNull();
    expect(stats.averageTimeSeconds).toBeNull();
  });

  it("accumulates multiple games and tracks best time", () => {
    recordResult("user3", true, 3, 45);
    recordResult("user3", true, 4, 20);
    recordResult("user3", false, 6);

    const stats = getStats("user3");
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.totalGuesses).toBe(13);
    expect(stats.winRate).toBe(67); // 2/3 rounded
    expect(stats.bestTimeSeconds).toBe(20);
    expect(stats.averageTimeSeconds).toBe(33); // (45+20)/2 rounded
  });
});
