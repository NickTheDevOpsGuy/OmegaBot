// src/services/core/config/guildConfigStore.test.ts
// Unit tests for guild config (SQLite store).

import { describe, expect, it } from "vitest";
import { getDb } from "../database/db.js";
import { useInMemoryDb } from "../database/dbTestUtils.js";
import {
  clearGuildWelcomeMessage,
  getGuildConfig,
  setGuildConfig,
  setGuildWelcomeMessage,
} from "./guildConfigStore.js";

describe("guildConfigStore", () => {
  useInMemoryDb();

  it("getGuildConfig returns defaults when guild has no stored config", async () => {
    const config = await getGuildConfig("guild-1");

    expect(config.guildId).toBe("guild-1");
    expect(config.welcomeEnabled).toBe(true);
    expect(config.welcomeMessage).toBeNull();
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
    expect(config.welcomeMessage).toBeNull();
    expect(config.starboardThreshold).toBe(3);
    expect(config.rulesChannelId).toBe("456");
    expect(config.levelingEnabled).toBe(true);
    expect(config.updatedAt).toBe(1000);
  });

  it("setGuildConfig patches and persists", async () => {
    const updated = await setGuildConfig("guild-3", {
      welcomeChannelId: "chan-1",
      welcomeMessage: "Welcome {user}",
      starboardThreshold: 5,
    });

    expect(updated.guildId).toBe("guild-3");
    expect(updated.welcomeChannelId).toBe("chan-1");
    expect(updated.welcomeMessage).toBe("Welcome {user}");
    expect(updated.starboardThreshold).toBe(5);
    expect(updated.updatedAt).toBeGreaterThan(0);

    const reloaded = await getGuildConfig("guild-3");

    expect(reloaded.welcomeChannelId).toBe("chan-1");
    expect(reloaded.welcomeMessage).toBe("Welcome {user}");
    expect(reloaded.starboardThreshold).toBe(5);
  });

  it("replaces and clears stored custom welcome messages", async () => {
    await setGuildWelcomeMessage(
      "guild-4",
      "Old WRDLNKDN welcome message https://github.com/WRDLNKDN/Agreements",
    );

    await setGuildWelcomeMessage("guild-4", "Fresh welcome for {server}");
    const replaced = await getGuildConfig("guild-4");

    expect(replaced.welcomeMessage).toBe("Fresh welcome for {server}");

    await clearGuildWelcomeMessage("guild-4");

    const cleared = await getGuildConfig("guild-4");
    expect(cleared.welcomeMessage).toBeNull();

    const row = getDb()
      .prepare(`SELECT config FROM guild_config WHERE guild_id = ?`)
      .get("guild-4") as { config: string };

    const stored = JSON.parse(row.config) as Record<string, unknown>;
    expect(stored).not.toHaveProperty("welcomeMessage");
    expect(row.config).not.toContain("WRDLNKDN");
  });
});
