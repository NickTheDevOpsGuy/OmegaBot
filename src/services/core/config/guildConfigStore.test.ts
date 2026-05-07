// src/services/core/config/guildConfigStore.test.ts
// Unit tests for guild config (SQLite store).

import { describe, expect, it } from "vitest";
import { getDb } from "../database/db.js";
import { useInMemoryDb } from "../database/dbTestUtils.js";
import { getGuildConfig, setGuildConfig } from "./guildConfigStore.js";

describe("guildConfigStore", () => {
  useInMemoryDb();

  it("getGuildConfig returns defaults when guild has no stored config", async () => {
    const config = await getGuildConfig("guild-1");

    expect(config.guildId).toBe("guild-1");
    expect(config.welcomeEnabled).toBe(true);
    expect(config.starboardThreshold).toBe(3);
    expect(config.rulesChannelId).toBeNull();
    expect(config.levelingEnabled).toBe(true);
  });

  it("getGuildConfig returns merged config when database has data", async () => {
    getDb()
      .prepare(
        `INSERT INTO guild_config (guild_id, config, updated_at)
         VALUES (?, ?, ?)`,
      )
      .run(
        "guild-2",
        JSON.stringify({
          welcomeEnabled: false,
          welcomeChannelId: "123",
          starboardChannelId: null,
          starboardThreshold: 3,
          rulesChannelId: "456",
        }),
        1000,
      );

    const config = await getGuildConfig("guild-2");

    expect(config.guildId).toBe("guild-2");
    expect(config.welcomeEnabled).toBe(false);
    expect(config.welcomeChannelId).toBe("123");
    expect(config.starboardThreshold).toBe(3);
    expect(config.rulesChannelId).toBe("456");
    expect(config.levelingEnabled).toBe(true);
    expect(config.updatedAt).toBe(1000);
  });

  it("setGuildConfig patches and persists", async () => {
    const updated = await setGuildConfig("guild-3", {
      welcomeChannelId: "chan-1",
      starboardThreshold: 5,
    });

    expect(updated.guildId).toBe("guild-3");
    expect(updated.welcomeChannelId).toBe("chan-1");
    expect(updated.starboardThreshold).toBe(5);
    expect(updated.updatedAt).toBeGreaterThan(0);

    const reloaded = await getGuildConfig("guild-3");

    expect(reloaded.welcomeChannelId).toBe("chan-1");
    expect(reloaded.starboardThreshold).toBe(5);
  });
});
