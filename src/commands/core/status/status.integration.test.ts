// src/commands/core/status/status.integration.test.ts
// Integration test: /status with mocked statuspage API.

import { describe, expect, it, vi } from "vitest";
import { execute } from "./status.js";

vi.mock("../../../services/integrations/statuspage/statuspageApi.js", () => ({
  fetchStatuspageSummary: vi.fn().mockResolvedValue({
    page: { name: "Vercel", url: "https://vercel.com", updated_at: "2024-01-01T00:00:00Z" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [],
    incidents: [],
  }),
}));

function createMockInteraction(subcommand: string) {
  const deferReply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const getSubcommand = vi.fn().mockReturnValue(subcommand);
  return {
    deferReply,
    editReply,
    options: { getSubcommand },
    user: { id: "status-test-user" },
  } as unknown as Parameters<typeof execute>[0];
}

describe("status integration", () => {
  it("defers then edits with formatted status for vercel", async () => {
    const mock = createMockInteraction("vercel");

    await execute(mock);

    expect(mock.deferReply).toHaveBeenCalled();
    expect(mock.editReply).toHaveBeenCalled();
    const content = mock.editReply.mock.calls[0]?.[0] ?? "";
    expect(content).toMatch(/Vercel|Operational|vercel\.com/i);
  });
});
