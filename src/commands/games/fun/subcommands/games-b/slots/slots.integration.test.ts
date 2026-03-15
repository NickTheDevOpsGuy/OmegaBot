// src/commands/games/fun/subcommands/games-b/slots/slots.integration.test.ts
// Integration test: runs slots command with mocked interaction.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInMemoryDb } from "../../../../../../services/core/database/dbTestUtils.js";
import { recordSlotsSpin } from "../../../../../../services/discord/discord/rateLimit/index.js";
import { run } from "./slots.js";

useInMemoryDb();

function createMockInteraction(overrides?: {
  stats?: boolean;
  leaderboard?: boolean;
  paytable?: boolean;
}): {
  editReply: ReturnType<typeof vi.fn>;
  user: { id: string };
  options: {
    getBoolean: (name: string) => boolean | null;
    getInteger: (name: string) => number | null;
  };
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
      getInteger: () => null,
    },
    guild: { preferredLocale: "en" },
  };
}

describe("slots integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs spin and returns slot result embed (final state, not Spinning…)", async () => {
    const mock = createMockInteraction();
    const interaction = mock as unknown as Parameters<typeof run>[0];

    await run(interaction);

    expect(mock.editReply).toHaveBeenCalled();
    const calls = mock.editReply.mock.calls;
    function getTitle(arg: unknown): string | undefined {
      if (typeof arg !== "object" || arg == null || !("embeds" in arg)) return undefined;
      const embeds = (arg as { embeds: unknown[] }).embeds;
      const first = embeds[0];
      if (!first || typeof first !== "object") return undefined;
      return (first as { data?: { title?: string }; title?: string }).data?.title ?? (first as { title?: string }).title;
    }
    const resultCall = [...calls].reverse().find((c) => {
      const title = getTitle(c[0]);
      return title?.includes("Slot Machine") && !title.includes("Spinning");
    });
    expect(resultCall).toBeDefined();
    const resultPayload = resultCall![0];
    const embeds = (resultPayload as { embeds: Array<{ data?: { title?: string; description?: string }; title?: string; description?: string }> }).embeds;
    expect(embeds.length).toBeGreaterThanOrEqual(1);
    const embed = embeds[0];
    const title = embed?.data?.title ?? embed?.title;
    expect(title).toMatch(/Slot Machine/);
    expect(title).not.toMatch(/Spinning/);
    const description = embed?.data?.description ?? embed?.description;
    expect(description).toBeDefined();
    expect(String(description)).toMatch(/[│|]/);
  });

  it("shows paytable when requested", async () => {
    const mock = createMockInteraction({ paytable: true });
    const interaction = mock as unknown as Parameters<typeof run>[0];

    await run(interaction);

    expect(mock.editReply).toHaveBeenCalled();

    const calls = mock.editReply.mock.calls;
    const arg = calls[calls.length - 1]?.[0];

    const content =
      typeof arg === "object" && arg?.embeds?.[0]?.data?.title
        ? arg.embeds[0].data.title
        : String(arg ?? "");

    expect(content).toMatch(/Slots Paytable/i);
  });

  it("shows rate limit when user spams", async () => {
    const userId = "slots-rate-limit-user";
    recordSlotsSpin(userId); // Prime cooldown so one run hits rate limit
    const mock = createMockInteraction();
    mock.user.id = userId;
    const interaction = mock as unknown as Parameters<typeof run>[0];

    await run(interaction);

    expect(mock.editReply).toHaveBeenCalledTimes(1);
    const arg = mock.editReply.mock.calls[0]?.[0];
    const content =
      typeof arg === "string"
        ? arg
        : typeof arg === "object" && arg && "content" in arg
          ? String(arg.content ?? "")
          : "";

    expect(content).toMatch(/Slow down/i);
  });
});
