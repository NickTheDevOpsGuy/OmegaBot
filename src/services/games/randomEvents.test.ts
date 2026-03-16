// src/services/games/randomEvents.test.ts
import { describe, it, expect } from "vitest";
import { rollRandomEvent, type RandomEventKind } from "./randomEvents.js";

describe("randomEvents", () => {
  it("returns valid result shape with kind, xpMultiplier, payoutMultiplier, label", () => {
    const result = rollRandomEvent();
    expect(result).toHaveProperty("kind");
    expect(result).toHaveProperty("xpMultiplier");
    expect(result).toHaveProperty("payoutMultiplier");
    expect(result).toHaveProperty("label");
    expect(typeof result.xpMultiplier).toBe("number");
    expect(typeof result.payoutMultiplier).toBe("number");
    expect(result.xpMultiplier).toBeGreaterThanOrEqual(1);
    expect(result.payoutMultiplier).toBeGreaterThanOrEqual(1);
  });

  it("returns none when triggerChance is 0", () => {
    for (let i = 0; i < 20; i++) {
      const result = rollRandomEvent({ triggerChance: 0 });
      expect(result.kind).toBe("none");
      expect(result.label).toBe("");
      expect(result.xpMultiplier).toBe(1);
      expect(result.payoutMultiplier).toBe(1);
    }
  });

  it("returns a bonus event when triggerChance is 1 and weights favor events", () => {
    const kinds: RandomEventKind[] = [];
    for (let i = 0; i < 50; i++) {
      const result = rollRandomEvent({
        triggerChance: 1,
        weights: {
          lucky_spin: 1,
          double_xp: 1,
          bonus_coins: 1,
          jackpot_boost: 1,
          none: 0,
        },
      });
      kinds.push(result.kind);
      if (result.kind !== "none") {
        expect(result.label.length).toBeGreaterThan(0);
        expect(result.xpMultiplier).toBeGreaterThanOrEqual(1);
        expect(result.payoutMultiplier).toBeGreaterThanOrEqual(1);
      }
    }
    expect(kinds.some((k) => k !== "none")).toBe(true);
  });
});
