// src/commands/rules/rules.integration.test.ts

import { describe, expect, it, vi } from "vitest";
import { execute } from "./rules.js";

function createMockInteraction(guildId: string | null) {
  const reply = vi.fn().mockResolvedValue(undefined);
  return {
    guildId,
    guild: guildId ? { preferredLocale: "en" } : null,
    reply,
  } as unknown as Parameters<typeof execute>[0];
}

describe("rules integration", () => {
  it("replies with guild_only when not in a guild", async () => {
    const mock = createMockInteraction(null);
    await execute(mock);
    expect(mock.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "This command can only be used in a server.",
        ephemeral: true,
      }),
    );
  });
});
