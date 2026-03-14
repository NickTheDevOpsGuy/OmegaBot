import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInMemoryDb } from "../../core/database/dbTestUtils.js";
import { doCheckIn } from "../../../commands/games/fun/subcommands/games-a/daily/daily.js";
import { recordDailyPlay } from "../fun/gameUsageMetrics.js";
import { getProgression } from "./progressionStore.js";
import { getDailyQuestBoard } from "./questStore.js";

useInMemoryDb();

describe("questStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));
  });

  it("returns a daily quest board", () => {
    const board = getDailyQuestBoard("user1");
    expect(board.quests).toHaveLength(3);
  });

  it("auto-claims xp for completed quests", () => {
    doCheckIn("user1");
    recordDailyPlay("user1", "trivia");
    recordDailyPlay("user1", "trivia");
    recordDailyPlay("user1", "blackjack");
    recordDailyPlay("user1", "blackjack");

    const before = getProgression("user1").xp;
    const board = getDailyQuestBoard("user1");
    const after = getProgression("user1").xp;

    expect(board.newlyClaimedXp).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(before);
    expect(board.quests.some((quest) => quest.claimed)).toBe(true);
  });
});
