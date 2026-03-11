// src/commands/admin/subcommands/health.integration.test.ts
// Integration test: runs /admin health with mocked interaction.

import { describe, expect, it, vi } from "vitest";
import { useInMemoryDb } from "../../../../services/core/database/dbTestUtils.js";
import { handleHealth } from "./health.js";

useInMemoryDb();

function createMockInteraction(): {
  reply: ReturnType<typeof vi.fn>;
  editReply: ReturnType<typeof vi.fn>;
  deferred: boolean;
  replied: boolean;
  user: { id: string };
} {
  const reply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  return {
    reply,
    editReply,
    deferred: true,
    replied: false,
    user: { id: "admin-test-user" },
  };
}

describe("health integration", () => {
  it("returns health embed with database status", async () => {
    const mock = createMockInteraction();
    const interaction = mock as unknown as Parameters<typeof handleHealth>[0];

    await handleHealth(interaction);

    expect(mock.editReply).toHaveBeenCalled();
    const arg = mock.editReply.mock.calls[0]?.[0];
    expect(arg).toBeDefined();
    expect(arg.embeds).toHaveLength(1);
    expect(arg.embeds[0].data.title).toBe("Health Check");
    expect(arg.embeds[0].data.description).toMatch(/Database/);
  });
});
