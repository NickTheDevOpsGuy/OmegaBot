// src/commands/fun/subcommands/dice.integration.test.ts
//
// Integration test: runs the full dice command with a mocked interaction.
// Verifies the command flow end-to-end without a real Discord connection.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { useInMemoryDb } from "../../../test/dbTestUtils.js";
import { run } from "./dice.js";

useInMemoryDb();

function createMockInteraction(overrides?: { sides?: number; count?: number }): {
  editReply: ReturnType<typeof vi.fn>;
  user: { id: string };
  options: { getInteger: (name: string) => number | null };
} {
  const editReply = vi.fn().mockResolvedValue(undefined);
  return {
    editReply,
    user: { id: "test-user-123" },
    options: {
      getInteger: (name: string) => {
        if (name === "sides") return overrides?.sides ?? 6;
        if (name === "count") return overrides?.count ?? 1;
        return null;
      },
    },
  };
}

describe("dice integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs full dice command and edits reply with result", async () => {
    const mock = createMockInteraction({ sides: 6, count: 1 });
    (mock as { user: { id: string } }).user.id = "dice-test-user-1";
    const interaction = mock as unknown as Parameters<typeof run>[0];

    await run(interaction);

    expect(mock.editReply).toHaveBeenCalled();
    const lastCall = mock.editReply.mock.calls[mock.editReply.mock.calls.length - 1];
    const content = lastCall?.[0];
    expect(typeof content).toBe("string");
    expect(content).toMatch(/You rolled \(d6\)/);
    expect(content).toMatch(/\([1-6]\)/);
  });

  it("handles multiple dice", async () => {
    const mock = createMockInteraction({ sides: 6, count: 3 });
    (mock as { user: { id: string } }).user.id = "dice-test-user-2";
    const interaction = mock as unknown as Parameters<typeof run>[0];

    await run(interaction);

    expect(mock.editReply).toHaveBeenCalled();
    const lastCall = mock.editReply.mock.calls[mock.editReply.mock.calls.length - 1];
    const content = lastCall?.[0];
    expect(content).toMatch(/Total:/);
  });

  it("shows rate limit message when user spams", async () => {
    const userId = "dice-rate-limit-user";
    const mock = createMockInteraction({ sides: 6, count: 1 });
    (mock as { user: { id: string } }).user.id = userId;
    const interaction = mock as unknown as Parameters<typeof run>[0];

    await run(interaction);
    expect(mock.editReply).toHaveBeenCalled();
    const firstContent =
      mock.editReply.mock.calls[mock.editReply.mock.calls.length - 1]?.[0];
    expect(firstContent).toMatch(/You rolled/);

    mock.editReply.mockClear();
    await run(interaction);

    expect(mock.editReply).toHaveBeenCalledTimes(1);
    const rateLimitContent = mock.editReply.mock.calls[0]?.[0];
    expect(rateLimitContent).toMatch(/Slow down!/);
    expect(rateLimitContent).toMatch(/seconds/);
  });
});
