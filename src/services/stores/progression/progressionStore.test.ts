import { describe, expect, it } from "vitest";
import { buildProgressBar, getLevelFromXp } from "./progressionMath.js";

describe("progressionStore", () => {
  it("starts at level 1", () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(99)).toBe(1);
  });

  it("levels up with increasing xp thresholds", () => {
    expect(getLevelFromXp(100)).toBe(2);
    expect(getLevelFromXp(249)).toBe(2);
    expect(getLevelFromXp(250)).toBe(3);
  });

  it("builds a progress bar", () => {
    expect(buildProgressBar(50, 100, 10)).toBe("█████░░░░░");
  });
});
