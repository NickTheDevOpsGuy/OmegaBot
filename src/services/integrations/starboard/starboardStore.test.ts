// src/services/starboard/starboardStore.test.ts
//
// Tests for starboard database operations.
//
// Coverage:
// - Creating starboard posts
// - Updating star counts
// - Retrieving posts
// - Deleting posts

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../core/database/dbTestUtils.js";
import { getDb } from "../../core/database/db.js";

useInMemoryDb();

// Schema setup (mirrors starboardHandler.ts)
function ensureStarboardTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS starboard_posts (
      original_message_id TEXT PRIMARY KEY,
      starboard_message_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      star_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_starboard_guild ON starboard_posts(guild_id);
  `);
}

type StarboardPost = {
  originalMessageId: string;
  starboardMessageId: string;
  guildId: string;
  channelId: string;
  starCount: number;
};

function getPost(originalMessageId: string): StarboardPost | null {
  ensureStarboardTable();
  const db = getDb();

  const row = db
    .prepare(`SELECT * FROM starboard_posts WHERE original_message_id = ?`)
    .get(originalMessageId) as
    | {
        original_message_id: string;
        starboard_message_id: string;
        guild_id: string;
        channel_id: string;
        star_count: number;
      }
    | undefined;

  if (!row) return null;

  return {
    originalMessageId: row.original_message_id,
    starboardMessageId: row.starboard_message_id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    starCount: row.star_count,
  };
}

function createPost(data: {
  originalMessageId: string;
  starboardMessageId: string;
  guildId: string;
  channelId: string;
  starCount: number;
}): void {
  ensureStarboardTable();
  const db = getDb();

  db.prepare(
    `
    INSERT INTO starboard_posts (original_message_id, starboard_message_id, guild_id, channel_id, star_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    data.originalMessageId,
    data.starboardMessageId,
    data.guildId,
    data.channelId,
    data.starCount,
    Date.now(),
  );
}

function updateStarCount(originalMessageId: string, starCount: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE starboard_posts SET star_count = ? WHERE original_message_id = ?`,
  ).run(starCount, originalMessageId);
}

function deletePost(originalMessageId: string): boolean {
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM starboard_posts WHERE original_message_id = ?`)
    .run(originalMessageId);
  return result.changes > 0;
}

function getGuildPosts(guildId: string): StarboardPost[] {
  ensureStarboardTable();
  const db = getDb();

  const rows = db
    .prepare(`SELECT * FROM starboard_posts WHERE guild_id = ? ORDER BY star_count DESC`)
    .all(guildId) as Array<{
    original_message_id: string;
    starboard_message_id: string;
    guild_id: string;
    channel_id: string;
    star_count: number;
  }>;

  return rows.map((row) => ({
    originalMessageId: row.original_message_id,
    starboardMessageId: row.starboard_message_id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    starCount: row.star_count,
  }));
}

describe("starboard store", () => {
  beforeEach(() => {
    ensureStarboardTable();
  });

  describe("createPost", () => {
    it("creates a starboard post", () => {
      createPost({
        originalMessageId: "orig1",
        starboardMessageId: "star1",
        guildId: "guild1",
        channelId: "channel1",
        starCount: 5,
      });

      const post = getPost("orig1");

      expect(post).not.toBeNull();
      expect(post!.starboardMessageId).toBe("star1");
      expect(post!.starCount).toBe(5);
    });
  });

  describe("getPost", () => {
    it("returns null for non-existent post", () => {
      const post = getPost("nonexistent");
      expect(post).toBeNull();
    });

    it("retrieves existing post", () => {
      createPost({
        originalMessageId: "orig1",
        starboardMessageId: "star1",
        guildId: "guild1",
        channelId: "channel1",
        starCount: 3,
      });

      const post = getPost("orig1");

      expect(post).not.toBeNull();
      expect(post!.guildId).toBe("guild1");
    });
  });

  describe("updateStarCount", () => {
    it("updates star count", () => {
      createPost({
        originalMessageId: "orig1",
        starboardMessageId: "star1",
        guildId: "guild1",
        channelId: "channel1",
        starCount: 3,
      });

      updateStarCount("orig1", 10);

      const post = getPost("orig1");
      expect(post!.starCount).toBe(10);
    });

    it("can decrease star count", () => {
      createPost({
        originalMessageId: "orig1",
        starboardMessageId: "star1",
        guildId: "guild1",
        channelId: "channel1",
        starCount: 10,
      });

      updateStarCount("orig1", 2);

      const post = getPost("orig1");
      expect(post!.starCount).toBe(2);
    });
  });

  describe("deletePost", () => {
    it("deletes existing post", () => {
      createPost({
        originalMessageId: "orig1",
        starboardMessageId: "star1",
        guildId: "guild1",
        channelId: "channel1",
        starCount: 5,
      });

      const deleted = deletePost("orig1");

      expect(deleted).toBe(true);
      expect(getPost("orig1")).toBeNull();
    });

    it("returns false for non-existent post", () => {
      const deleted = deletePost("nonexistent");
      expect(deleted).toBe(false);
    });
  });

  describe("getGuildPosts", () => {
    it("returns posts for guild sorted by star count", () => {
      createPost({
        originalMessageId: "orig1",
        starboardMessageId: "star1",
        guildId: "guild1",
        channelId: "channel1",
        starCount: 3,
      });

      createPost({
        originalMessageId: "orig2",
        starboardMessageId: "star2",
        guildId: "guild1",
        channelId: "channel1",
        starCount: 10,
      });

      createPost({
        originalMessageId: "orig3",
        starboardMessageId: "star3",
        guildId: "guild1",
        channelId: "channel1",
        starCount: 5,
      });

      const posts = getGuildPosts("guild1");

      expect(posts.length).toBe(3);
      expect(posts[0].starCount).toBe(10);
      expect(posts[1].starCount).toBe(5);
      expect(posts[2].starCount).toBe(3);
    });

    it("filters by guild", () => {
      createPost({
        originalMessageId: "orig1",
        starboardMessageId: "star1",
        guildId: "guild1",
        channelId: "channel1",
        starCount: 5,
      });

      createPost({
        originalMessageId: "orig2",
        starboardMessageId: "star2",
        guildId: "guild2",
        channelId: "channel2",
        starCount: 5,
      });

      expect(getGuildPosts("guild1").length).toBe(1);
      expect(getGuildPosts("guild2").length).toBe(1);
      expect(getGuildPosts("guild3").length).toBe(0);
    });
  });
});
