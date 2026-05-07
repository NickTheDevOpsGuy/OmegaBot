import { describe, expect, it } from "vitest";
import { useInMemoryDb } from "../../core/database/dbTestUtils.js";
import {
  awardGuildMessageXp,
  getGuildLeaderboard,
  getGuildProgression,
  getUnlockedLevelRoleRewards,
  listLevelRoleRewards,
  removeLevelRoleReward,
  setLevelRoleReward,
} from "./levelingStore.js";

describe("levelingStore", () => {
  useInMemoryDb();

  it("tracks guild-specific message XP and ranks", () => {
    const result = awardGuildMessageXp("guild1", "user1", 120);
    awardGuildMessageXp("guild1", "user2", 40);
    awardGuildMessageXp("guild2", "user1", 10);

    expect(result.leveledUp).toBe(true);
    expect(result.after.level).toBe(2);

    const progress = getGuildProgression("guild1", "user1");
    expect(progress.xp).toBe(120);
    expect(progress.messageCount).toBe(1);
    expect(progress.rank).toBe(1);

    const otherGuildProgress = getGuildProgression("guild2", "user1");
    expect(otherGuildProgress.xp).toBe(10);
    expect(otherGuildProgress.rank).toBe(1);
  });

  it("returns leaderboard rows in rank order", () => {
    awardGuildMessageXp("guild1", "user1", 50);
    awardGuildMessageXp("guild1", "user2", 150);

    const rows = getGuildLeaderboard("guild1");

    expect(rows.map((row) => row.userId)).toEqual(["user2", "user1"]);
    expect(rows.map((row) => row.rank)).toEqual([1, 2]);
  });

  it("manages level role rewards", () => {
    setLevelRoleReward("guild1", 5, "role5");
    setLevelRoleReward("guild1", 10, "role10");
    setLevelRoleReward("guild1", 5, "role5b");

    expect(listLevelRoleRewards("guild1")).toEqual([
      { guildId: "guild1", level: 5, roleId: "role5b" },
      { guildId: "guild1", level: 10, roleId: "role10" },
    ]);
    expect(getUnlockedLevelRoleRewards("guild1", 7)).toEqual([
      { guildId: "guild1", level: 5, roleId: "role5b" },
    ]);
    expect(removeLevelRoleReward("guild1", 5)).toBe(true);
    expect(removeLevelRoleReward("guild1", 5)).toBe(false);
  });
});
