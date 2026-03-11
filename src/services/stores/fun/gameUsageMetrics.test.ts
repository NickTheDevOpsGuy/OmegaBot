// src/services/fun/gameUsageMetrics.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../core/database/dbTestUtils.js";
import {
  recordDailyPlay,
  getTodayCommandPlays,
  getTodayUserPlays,
} from "./gameUsageMetrics.js";

useInMemoryDb();

describe("gameUsageMetrics", () => {
  beforeEach(() => {
    // Each test gets fresh in-memory DB
  });

  it("records a play and returns it in getTodayCommandPlays", () => {
    recordDailyPlay("user1", "slots");
    recordDailyPlay("user2", "slots");

    expect(getTodayCommandPlays("slots")).toBe(2);
  });

  it("records a play and returns it in getTodayUserPlays", () => {
    recordDailyPlay("user1", "slots");
    recordDailyPlay("user1", "blackjack");

    expect(getTodayUserPlays("user1")).toBe(2);
  });

  it("increments count for same user/command on same day", () => {
    recordDailyPlay("user1", "dice");
    recordDailyPlay("user1", "dice");
    recordDailyPlay("user1", "dice");

    expect(getTodayCommandPlays("dice")).toBe(3);
    expect(getTodayUserPlays("user1")).toBe(3);
  });

  it("returns 0 for command with no plays", () => {
    expect(getTodayCommandPlays("trivia")).toBe(0);
  });

  it("returns 0 for user with no plays", () => {
    expect(getTodayUserPlays("nonexistent")).toBe(0);
  });

  it("tracks multiple commands and users", () => {
    recordDailyPlay("user1", "slots");
    recordDailyPlay("user1", "blackjack");
    recordDailyPlay("user2", "slots");

    expect(getTodayCommandPlays("slots")).toBe(2);
    expect(getTodayCommandPlays("blackjack")).toBe(1);
    expect(getTodayUserPlays("user1")).toBe(2);
    expect(getTodayUserPlays("user2")).toBe(1);
  });
});
