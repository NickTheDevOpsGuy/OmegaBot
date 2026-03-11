// src/commands/suggestion/suggestion.integration.test.ts
// Integration test: suggestion command guild_only.

import { describe, expect, it, vi } from "vitest";
import { execute } from "./suggestion.js";

function createMockInteraction(guildId: string | null) {
  const reply = vi.fn().mockResolvedValue(undefined);
  return {
    guildId,
    guild: guildId ? { preferredLocale: "en" } : null,
    reply,
    options: { getBoolean: vi.fn().mockReturnValue(true) },
  } as unknown as Parameters<typeof execute>[0];
}

describe("suggestion integration", () => {
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
