// src/commands/faq/subcommands/add.integration.test.ts
// Integration test: FAQ add validation (empty key) and i18n.

import { describe, expect, it, vi } from "vitest";
import { useInMemoryDb } from "../../../../services/core/database/dbTestUtils.js";
import { run } from "./add.js";

useInMemoryDb();

function createMockInteraction(
  overrides: {
    guildId?: string;
    key?: string;
    title?: string;
    body?: string;
    tags?: string | null;
  } = {},
) {
  const {
    guildId = "g1",
    key = "key",
    title = "Title",
    body = "Body",
    tags = null,
  } = overrides;
  const editReply = vi.fn().mockResolvedValue(undefined);
  return {
    guildId,
    guild: { preferredLocale: "en" as const },
    editReply,
    options: {
      getString: vi.fn((name: string) => {
        if (name === "key") return key;
        if (name === "title") return title;
        if (name === "body") return body;
        if (name === "tags") return tags;
        return null;
      }),
    },
    inGuild: vi.fn().mockReturnValue(true),
    memberPermissions: { has: vi.fn().mockReturnValue(true) },
  } as unknown as Parameters<typeof run>[0];
}

describe("FAQ add integration", () => {
  it("editReplies with key_empty when key is empty", async () => {
    const mock = createMockInteraction({ key: "   " });
    await run(mock);
    expect(mock.editReply).toHaveBeenCalledWith(
      expect.stringContaining("Key cannot be empty"),
    );
  });

  it("editReplies with title_empty when title is empty", async () => {
    const mock = createMockInteraction({ title: "   " });
    await run(mock);
    expect(mock.editReply).toHaveBeenCalledWith(
      expect.stringContaining("Title cannot be empty"),
    );
  });

  it("editReplies with body_empty when body is empty", async () => {
    const mock = createMockInteraction({ body: "   " });
    await run(mock);
    expect(mock.editReply).toHaveBeenCalledWith(
      expect.stringContaining("Body cannot be empty"),
    );
  });
});
