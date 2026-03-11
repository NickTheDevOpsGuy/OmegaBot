// src/services/discord/rateLimit/rateLimit.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import {
  checkSlotsCooldown,
  recordSlotsSpin,
  checkBlackjackCooldown,
  recordBlackjackGame,
  checkDiceCooldown,
  recordDiceRoll,
  checkHangmanCooldown,
  recordHangmanGame,
} from "./rateLimit.js";

describe("rateLimit", () => {
  beforeEach(() => {
    // Rate limits are in-memory; runs are isolated per test file
    // We can't reset the map, but we use unique userIds per test
  });

  describe("slots", () => {
    it("returns 0 when no previous spin", () => {
      expect(checkSlotsCooldown("user-slots-1")).toBe(0);
    });

    it("returns remaining ms after spin", () => {
      recordSlotsSpin("user-slots-2");
      const remaining = checkSlotsCooldown("user-slots-2");
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(3000);
    });
  });

  describe("blackjack", () => {
    it("returns 0 when no previous game", () => {
      expect(checkBlackjackCooldown("user-bj-1")).toBe(0);
    });

    it("returns remaining ms after game", () => {
      recordBlackjackGame("user-bj-2");
      const remaining = checkBlackjackCooldown("user-bj-2");
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(5000);
    });
  });

  describe("dice", () => {
    it("returns 0 when no previous roll", () => {
      expect(checkDiceCooldown("user-dice-1")).toBe(0);
    });

    it("returns remaining ms after roll", () => {
      recordDiceRoll("user-dice-2");
      const remaining = checkDiceCooldown("user-dice-2");
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(2000);
    });
  });

  describe("hangman", () => {
    it("returns 0 when no previous game", () => {
      expect(checkHangmanCooldown("user-hm-1")).toBe(0);
    });

    it("returns remaining ms after game", () => {
      recordHangmanGame("user-hm-2");
      const remaining = checkHangmanCooldown("user-hm-2");
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(10000);
    });
  });

  describe("isolation", () => {
    it("different commands have independent cooldowns", () => {
      recordSlotsSpin("user-multi");
      recordBlackjackGame("user-multi");

      expect(checkSlotsCooldown("user-multi")).toBeGreaterThan(0);
      expect(checkBlackjackCooldown("user-multi")).toBeGreaterThan(0);
    });

    it("different users have independent cooldowns", () => {
      recordSlotsSpin("user-a");
      expect(checkSlotsCooldown("user-a")).toBeGreaterThan(0);
      expect(checkSlotsCooldown("user-b")).toBe(0);
    });
  });
});
