// src/commands/ping/ping.integration.test.ts
// Integration test: runs full /ping with mocked interaction.

import { describe, expect, it, vi } from "vitest";
import { execute } from "./ping.js";

function createMockInteraction(): {
  reply: ReturnType<typeof vi.fn>;
  editReply: ReturnType<typeof vi.fn>;
  fetchReply: ReturnType<typeof vi.fn>;
  createdTimestamp: number;
  user: { id: string };
  client: { ws: { ping: number } };
} {
  const created = Date.now();
  const sentTimestamp = created + 50;
  const reply = vi.fn().mockResolvedValue({ createdTimestamp: sentTimestamp });
  const editReply = vi.fn().mockResolvedValue(undefined);
  const fetchReply = vi.fn().mockResolvedValue({ createdTimestamp: sentTimestamp });
  return {
    reply,
    editReply,
    fetchReply,
    createdTimestamp: created,
    user: { id: "ping-test-user" },
    client: { ws: { ping: 42 } },
  };
}

describe("ping integration", () => {
  it("replies with latency", async () => {
    const mock = createMockInteraction();
    const interaction = mock as unknown as Parameters<typeof execute>[0];

    await execute(interaction);

    expect(mock.reply).toHaveBeenCalledWith("Pinging...");
    expect(mock.editReply).toHaveBeenCalled();
    const content = mock.editReply.mock.calls[0]?.[0];
    expect(content).toMatch(/Pong/);
    expect(content).toMatch(/latency|ms/);
  });
});
