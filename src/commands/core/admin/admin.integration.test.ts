// src/commands/admin/admin.integration.test.ts
// Integration test: admin command guild_only and permission paths.

import { describe, expect, it, vi } from "vitest";
import { useInMemoryDb } from "../../../services/core/database/dbTestUtils.js";
import { execute } from "./admin.js";

useInMemoryDb();

function createMockInteraction(overrides: {
  guildId?: string | null;
  inGuild?: boolean;
  subcommand?: string;
  memberHasModeratorRole?: boolean;
} = {}) {
  const {
    guildId = null,
    inGuild = false,
    subcommand = "timeout",
    memberHasModeratorRole = false,
  } = overrides;
  const deferReply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const member = {
    roles: { cache: { has: () => memberHasModeratorRole } },
  };
  return {
    guildId,
    guild: guildId ? { preferredLocale: "en" } : null,
    user: { id: "user-without-admin" },
    member,
    memberPermissions: { has: () => false },
    inGuild: vi.fn().mockReturnValue(inGuild),
    options: {
      getSubcommand: vi.fn().mockReturnValue(subcommand),
    },
    deferReply,
    editReply,
    replied: false,
    deferred: true,
  } as unknown as Parameters<typeof execute>[0];
}

describe("admin integration", () => {
  it("replies with guild_only when not in a guild", async () => {
    const mock = createMockInteraction({ guildId: null, inGuild: false });
    await execute(mock);
    expect(mock.deferReply).toHaveBeenCalled();
    expect(mock.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("This command can only be used in a server."),
      }),
    );
  });

  it("replies with no_permission when in guild but user cannot moderate", async () => {
    const mock = createMockInteraction({
      guildId: "g1",
      inGuild: true,
      subcommand: "timeout",
      memberHasModeratorRole: false,
    });
    await execute(mock);
    expect(mock.deferReply).toHaveBeenCalled();
    expect(mock.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringMatching(/permission|ADMIN_USER_IDS|moderator/),
      }),
    );
  });
});
