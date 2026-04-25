// src/services/core/config/guildConfigStore.test.ts
// Unit tests for guild config (JSON store). Uses mocked fs so we don't touch real data dir.

import { describe, expect, it, vi, beforeEach } from "vitest";
import * as fs from "node:fs/promises";
import { getGuildConfig, setGuildConfig } from "./guildConfigStore.js";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

describe("guildConfigStore", () => {
  beforeEach(() => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue("{}");
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  });

  it("getGuildConfig returns defaults when guild has no stored config", async () => {
    vi.mocked(fs.readFile).mockResolvedValue("{}");

    const config = await getGuildConfig("guild-1");

    expect(config.guildId).toBe("guild-1");
    expect(config.welcomeEnabled).toBe(true);
    expect(config.starboardThreshold).toBe(3);
    expect(config.rulesChannelId).toBeNull();
  });

  it("getGuildConfig returns merged config when store has data", async () => {
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({
        "guild-2": {
          welcomeEnabled: false,
          welcomeChannelId: "123",
          starboardChannelId: null,
          starboardThreshold: 3,
          rulesChannelId: "456",
          updatedAt: 0,
        },
      }),
    );

    const config = await getGuildConfig("guild-2");

    expect(config.guildId).toBe("guild-2");
    expect(config.welcomeEnabled).toBe(false);
    expect(config.welcomeChannelId).toBe("123");
    expect(config.starboardThreshold).toBe(3);
    expect(config.rulesChannelId).toBe("456");
  });

  it("setGuildConfig patches and persists", async () => {
    vi.mocked(fs.readFile).mockResolvedValue("{}");

    const updated = await setGuildConfig("guild-3", {
      welcomeChannelId: "chan-1",
      starboardThreshold: 5,
    });

    expect(updated.guildId).toBe("guild-3");
    expect(updated.welcomeChannelId).toBe("chan-1");
    expect(updated.starboardThreshold).toBe(5);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it("getGuildConfig returns empty defaults when file missing", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

    const config = await getGuildConfig("guild-new");

    expect(config.guildId).toBe("guild-new");
    expect(config.welcomeEnabled).toBe(true);
  });
});
