// src/services/core/config/guildConfigStore.test.ts
// Unit tests for guild config (JSON store). Uses mocked fs so we don't touch real data dir.

import { describe, expect, it, vi, beforeEach } from "vitest";
import fs from "fs";
import { getGuildConfig, setGuildConfig } from "./guildConfigStore.js";

vi.mock("fs");

describe("guildConfigStore", () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("{}");
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.mkdirSync).mockImplementation(() => {});
  });

  it("getGuildConfig returns defaults when guild has no stored config", () => {
    vi.mocked(fs.readFileSync).mockReturnValue("{}");

    const config = getGuildConfig("guild-1");

    expect(config.guildId).toBe("guild-1");
    expect(config.welcomeEnabled).toBe(true);
    expect(config.starboardThreshold).toBe(3);
    expect(config.rulesChannelId).toBeNull();
  });

  it("getGuildConfig returns merged config when store has data", () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
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

    const config = getGuildConfig("guild-2");

    expect(config.guildId).toBe("guild-2");
    expect(config.welcomeEnabled).toBe(false);
    expect(config.welcomeChannelId).toBe("123");
    expect(config.starboardThreshold).toBe(3);
    expect(config.rulesChannelId).toBe("456");
  });

  it("setGuildConfig patches and persists", () => {
    vi.mocked(fs.readFileSync).mockReturnValue("{}");

    const updated = setGuildConfig("guild-3", {
      welcomeChannelId: "chan-1",
      starboardThreshold: 5,
    });

    expect(updated.guildId).toBe("guild-3");
    expect(updated.welcomeChannelId).toBe("chan-1");
    expect(updated.starboardThreshold).toBe(5);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it("getGuildConfig returns empty defaults when file missing", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const config = getGuildConfig("guild-new");

    expect(config.guildId).toBe("guild-new");
    expect(config.welcomeEnabled).toBe(true);
  });
});
