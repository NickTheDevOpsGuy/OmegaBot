// src/commands/fun/subcommands/slots.integration.test.ts
// Integration test: runs slots command with mocked interaction.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { useInMemoryDb } from "../../../../../../services/core/database/dbTestUtils.js";
import { run } from "./slots.js";

useInMemoryDb();

function createMockInteraction(overrides?: {
  stats?: boolean;
  leaderboard?: boolean;
  paytable?: boolean;
}): {
  editReply: ReturnType<typeof vi.fn>;
  user: { id: string };
  options: { getBoolean: (name: string) => boolean | null };
  guild?: { preferredLocale?: string };
} {
  const editReply = vi.fn().mockResolvedValue(undefined);
  return {
    editReply,
    user: { id: "slots-test-user" },
    options: {
      getBoolean: (name: string) => {
        if (name === "stats") return overrides?.stats ?? false;
        if (name === "leaderboard") return overrides?.leaderboard ?? false;
        if (name === "paytable") return overrides?.paytable ?? false;
        return null;
      },
    },
    guild: { preferredLocale: "en" },
  };
}

describe("slots integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs spin and returns slot result embed", async () => {
    const mock = createMockInteraction();
    const interaction = mock as unknown as Parameters<typeof run>[0];

    await run(interaction);

    expect(mock.editReply).toHaveBeenCalled();
    const arg = mock.editReply.mock.calls[0]?.[0];
    expect(arg).toBeDefined();
    if (typeof arg === "object" && "embeds" in arg) {
      expect(arg.embeds).toHaveLength(1);
      expect(arg.embeds[0].data.title).toMatch(/Slot Machine/);
    }
  });

  it("shows paytable when requested", async () => {
    const mock = createMockInteraction({ paytable: true });
    const interaction = mock as unknown as Parameters<typeof run>[0];

    await run(interaction);

    expect(mock.editReply).toHaveBeenCalled();
    const arg = mock.editReply.mock.calls[0]?.[0];
    const content =
      typeof arg === "object" && arg?.embeds?.[0]?.data?.title
        ? arg.embeds[0].data.title
        : String(arg ?? "");
    expect(content).toMatch(/Slots Paytable/i);
  });

  it("shows rate limit when user spams", async () => {
    const userId = "slots-rate-limit-user";
    const mock = createMockInteraction();
    (mock as { user: { id: string } }).user.id = userId;
    const interaction = mock as unknown as Parameters<typeof run>[0];

    await run(interaction);
    expect(mock.editReply).toHaveBeenCalled();

    mock.editReply.mockClear();
    await run(interaction);

    expect(mock.editReply).toHaveBeenCalledTimes(1);
    const content =
      typeof mock.editReply.mock.calls[0]?.[0] === "string"
        ? mock.editReply.mock.calls[0]?.[0]
        : "";
    expect(content).toMatch(/Slow down/);
  });
});
