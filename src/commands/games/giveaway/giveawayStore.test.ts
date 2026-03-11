// src/commands/giveaway/giveawayStore.test.ts
//
// Tests for the giveaway store (database operations).
//
// Coverage:
// - Giveaway CRUD
// - Entry management
// - Winner selection

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../../services/core/database/dbTestUtils.js";
import {
  ensureGiveawayTables,
  createGiveaway,
  getGiveaway,
  getActiveGiveaways,
  endGiveaway,
  addEntry,
  removeEntry,
  getEntries,
  getEntryCount,
  selectWinners,
} from "./giveawayStore.js";

useInMemoryDb();

describe("giveawayStore", () => {
  beforeEach(() => {
    ensureGiveawayTables();
  });

  describe("createGiveaway", () => {
    it("creates a giveaway and returns ID", () => {
      const id = createGiveaway({
        guildId: "guild1",
        channelId: "channel1",
        hostId: "host1",
        prize: "Steam Gift Card",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      expect(id).toBeGreaterThan(0);
    });

    it("stores all giveaway data correctly", () => {
      const endsAt = Date.now() + 3600000;
      const id = createGiveaway({
        guildId: "guild1",
        channelId: "channel1",
        hostId: "host1",
        prize: "Steam Gift Card",
        winnerCount: 3,
        endsAt,
      });

      const giveaway = getGiveaway(id);

      expect(giveaway).not.toBeNull();
      expect(giveaway!.prize).toBe("Steam Gift Card");
      expect(giveaway!.winner_count).toBe(3);
      expect(giveaway!.ends_at).toBe(endsAt);
      expect(giveaway!.ended).toBe(0);
    });
  });

  describe("getGiveaway", () => {
    it("returns null for non-existent ID", () => {
      const giveaway = getGiveaway(99999);
      expect(giveaway).toBeNull();
    });
  });

  describe("getActiveGiveaways", () => {
    it("returns only active giveaways for guild", () => {
      const id1 = createGiveaway({
        guildId: "guild1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize 1",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      const id2 = createGiveaway({
        guildId: "guild1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize 2",
        winnerCount: 1,
        endsAt: Date.now() + 7200000,
      });

      // End one of them
      endGiveaway(id1, ["winner1"]);

      const active = getActiveGiveaways("guild1");

      expect(active.length).toBe(1);
      expect(active[0].id).toBe(id2);
    });

    it("filters by guild", () => {
      createGiveaway({
        guildId: "guild1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize 1",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      createGiveaway({
        guildId: "guild2",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize 2",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      expect(getActiveGiveaways("guild1").length).toBe(1);
      expect(getActiveGiveaways("guild2").length).toBe(1);
      expect(getActiveGiveaways("guild3").length).toBe(0);
    });
  });

  describe("entry management", () => {
    it("allows users to enter", () => {
      const giveawayId = createGiveaway({
        guildId: "g1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      const success = addEntry(giveawayId, "user1");

      expect(success).toBe(true);
      expect(getEntryCount(giveawayId)).toBe(1);
    });

    it("prevents duplicate entries", () => {
      const giveawayId = createGiveaway({
        guildId: "g1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      addEntry(giveawayId, "user1");
      const duplicate = addEntry(giveawayId, "user1");

      expect(duplicate).toBe(false);
      expect(getEntryCount(giveawayId)).toBe(1);
    });

    it("allows users to leave", () => {
      const giveawayId = createGiveaway({
        guildId: "g1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      addEntry(giveawayId, "user1");
      const left = removeEntry(giveawayId, "user1");

      expect(left).toBe(true);
      expect(getEntryCount(giveawayId)).toBe(0);
    });

    it("handles leave for non-entered user", () => {
      const giveawayId = createGiveaway({
        guildId: "g1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      const left = removeEntry(giveawayId, "user1");
      expect(left).toBe(false);
    });

    it("getEntries returns all entered users", () => {
      const giveawayId = createGiveaway({
        guildId: "g1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      addEntry(giveawayId, "user1");
      addEntry(giveawayId, "user2");
      addEntry(giveawayId, "user3");

      const entries = getEntries(giveawayId);

      expect(entries.length).toBe(3);
      expect(entries).toContain("user1");
      expect(entries).toContain("user2");
      expect(entries).toContain("user3");
    });
  });

  describe("winner selection", () => {
    it("returns empty array when no entries", () => {
      const giveawayId = createGiveaway({
        guildId: "g1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      const winners = selectWinners(giveawayId, 1);
      expect(winners).toEqual([]);
    });

    it("selects up to winnerCount winners", () => {
      const giveawayId = createGiveaway({
        guildId: "g1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize",
        winnerCount: 3,
        endsAt: Date.now() + 3600000,
      });

      addEntry(giveawayId, "user1");
      addEntry(giveawayId, "user2");
      addEntry(giveawayId, "user3");
      addEntry(giveawayId, "user4");
      addEntry(giveawayId, "user5");

      const winners = selectWinners(giveawayId, 3);

      expect(winners.length).toBe(3);
      // All winners should be unique
      expect(new Set(winners).size).toBe(3);
      // All winners should be from entries
      winners.forEach((w) => {
        expect(["user1", "user2", "user3", "user4", "user5"]).toContain(w);
      });
    });

    it("returns all entries if fewer than winnerCount", () => {
      const giveawayId = createGiveaway({
        guildId: "g1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize",
        winnerCount: 5,
        endsAt: Date.now() + 3600000,
      });

      addEntry(giveawayId, "user1");
      addEntry(giveawayId, "user2");

      const winners = selectWinners(giveawayId, 5);

      expect(winners.length).toBe(2);
      expect(winners.sort()).toEqual(["user1", "user2"]);
    });
  });

  describe("endGiveaway", () => {
    it("marks giveaway as ended with winners", () => {
      const giveawayId = createGiveaway({
        guildId: "g1",
        channelId: "c1",
        hostId: "h1",
        prize: "Prize",
        winnerCount: 1,
        endsAt: Date.now() + 3600000,
      });

      endGiveaway(giveawayId, ["user1", "user2"]);

      const giveaway = getGiveaway(giveawayId);

      expect(giveaway!.ended).toBe(1);
      expect(JSON.parse(giveaway!.winners!)).toEqual(["user1", "user2"]);
    });
  });
});
