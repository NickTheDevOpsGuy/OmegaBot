// src/commands/core/help/help.integration.test.ts
// Integration test: runs /help with mocked interaction and dependencies.

import { describe, expect, it, vi } from "vitest";
import { execute } from "./help.js";

vi.mock("../admin/admin.js", () => ({ isModerator: vi.fn().mockResolvedValue(false) }));
vi.mock("../../../services/discord/discord/commandMeta.js", () => ({
  extractCommandList: vi.fn().mockReturnValue([]),
}));

function createMockInteraction(topic: string | null = "overview", ephemeral = true) {
  const deferReply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const getBoolean = vi.fn().mockReturnValue(ephemeral);
  const getString = vi.fn().mockReturnValue(topic);
  return {
    deferReply,
    editReply,
    options: { getBoolean, getString },
    user: { id: "help-test-user" },
    client: {},
  } as unknown as Parameters<typeof execute>[0];
}

describe("help integration", () => {
  it("defers then edits with help content for overview topic", async () => {
    const mock = createMockInteraction("overview");

    await execute(mock);

    expect(mock.deferReply).toHaveBeenCalled();
    expect(mock.editReply).toHaveBeenCalled();
    const content =
      (mock.editReply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]?.content ?? "";
    expect(content).toMatch(/overview|OmegaBot|help/i);
  });

  it("includes topic content when topic is fun", async () => {
    const mock = createMockInteraction("fun");

    await execute(mock);

    expect(mock.editReply).toHaveBeenCalled();
    const content =
      (mock.editReply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]?.content ?? "";
    expect(content.length).toBeGreaterThan(0);
  });

  it("includes notion help content when topic is notion", async () => {
    const mock = createMockInteraction("notion");

    await execute(mock);

    expect(mock.editReply).toHaveBeenCalled();
    const content =
      (mock.editReply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]?.content ?? "";
    expect(content).toContain("/notion search");
    expect(content).toContain("/notion open");
    expect(content).toContain("/notion recent");
    expect(content).toContain("/wiki");
  });
});
