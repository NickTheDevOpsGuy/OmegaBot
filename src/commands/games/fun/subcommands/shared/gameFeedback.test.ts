import { describe, expect, it } from "vitest";
import {
  buildMilestoneLine,
  buildRankTeaser,
  findLeaderboardRank,
  formatOrdinal,
} from "./gameFeedback.js";

describe("gameFeedback", () => {
  it("finds a leaderboard rank", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(findLeaderboardRank(rows, (row) => row.id === "b")).toBe(2);
    expect(findLeaderboardRank(rows, (row) => row.id === "z")).toBeNull();
  });

  it("formats ordinals", () => {
    expect(formatOrdinal(1)).toBe("1st");
    expect(formatOrdinal(2)).toBe("2nd");
    expect(formatOrdinal(3)).toBe("3rd");
    expect(formatOrdinal(11)).toBe("11th");
    expect(formatOrdinal(23)).toBe("23rd");
  });

  it("builds milestone lines only when crossing a milestone", () => {
    expect(buildMilestoneLine(0, 1, [1, 5, 10], "wins")).toContain("1 wins");
    expect(buildMilestoneLine(1, 4, [1, 5, 10], "wins")).toBeUndefined();
  });

  it("only shows rank teasers for top ranks", () => {
    expect(buildRankTeaser(3, "trivia")).toContain("3rd");
    expect(buildRankTeaser(12, "trivia")).toBeUndefined();
  });
});
