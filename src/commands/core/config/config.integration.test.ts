// src/commands/config/config.integration.test.ts
// Integration tests for /config (moderator-role, guild_only).

import { describe, expect, it, vi } from "vitest";
import { useInMemoryDb } from "../../../services/core/database/dbTestUtils.js";
import { getDb } from "../../../services/core/database/db.js";
import { execute } from "./config.js";

useInMemoryDb();

function createMockInteraction(overrides: {
  guildId?: string | null;
  group?: string | null;
  sub?: string;
  role?: { id: string; name: string };
} = {}) {
  const { guildId = "g1", group = "moderator-role", sub = "add", role } = overrides;
  const reply = vi.fn().mockResolvedValue(undefined);
  return {
    guildId,
    guild: guildId ? { preferredLocale: "en" } : null,
    reply,
    options: {
      getSubcommandGroup: vi.fn().mockReturnValue(group),
      getSubcommand: vi.fn().mockReturnValue(sub),
      getRole: vi.fn().mockReturnValue(role ?? { id: "role-1", name: "Moderator" }),
    },
  } as unknown as Parameters<typeof execute>[0];
}

describe("config integration", () => {
  it("replies with guild_only when not in a guild", async () => {
    const mock = createMockInteraction({ guildId: null });
    await execute(mock);
    expect(mock.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "This command can only be used in a server.",
        flags: expect.any(Number),
      }),
    );
  });

  it("moderator-role add: persists role and replies with success", async () => {
    const mock = createMockInteraction({
      guildId: "g1",
      group: "moderator-role",
      sub: "add",
      role: { id: "r1", name: "Mod" },
    });
    await execute(mock);
    const replyArg = (mock.reply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | { content?: string }
      | undefined;
    expect(replyArg?.content).toContain("Mod");
    expect(replyArg?.content).toContain("/admin");
    const rows = getDb()
      .prepare("SELECT role_id FROM moderator_roles WHERE guild_id = ?")
      .all("g1") as Array<{ role_id: string }>;
    expect(rows.map((r) => r.role_id)).toContain("r1");
  });

  it("moderator-role list: replies with role list", async () => {
    const db = getDb();
    db.exec(
      "CREATE TABLE IF NOT EXISTS moderator_roles (guild_id TEXT NOT NULL, role_id TEXT NOT NULL, PRIMARY KEY (guild_id, role_id))",
    );
    db.prepare("INSERT INTO moderator_roles (guild_id, role_id) VALUES (?, ?)").run("g1", "r1");
    const mock = createMockInteraction({
      guildId: "g1",
      group: "moderator-role",
      sub: "list",
    });
    await execute(mock);
    expect(mock.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringMatching(/<@&r1>|Moderator roles/),
      }),
    );
  });
});
