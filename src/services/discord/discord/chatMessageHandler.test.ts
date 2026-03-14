import { describe, expect, it } from "vitest";
import { getChatPrompt } from "./chatMessageHandler.js";

describe("getChatPrompt", () => {
  const client = {
    user: { id: "bot-1" },
  } as const;

  it("returns full DM content", () => {
    const message = {
      content: "  hey there  ",
      channel: {
        isDMBased: () => true,
      },
    } as const;

    expect(getChatPrompt(message as never, client as never)).toBe("hey there");
  });

  it("returns mention content in guild messages", () => {
    const message = {
      content: "<@bot-1> how are you?",
      channel: {
        isDMBased: () => false,
      },
      mentions: {
        everyone: false,
        has: (user: { id: string }) => user.id === "bot-1",
      },
    } as const;

    expect(getChatPrompt(message as never, client as never)).toBe("how are you?");
  });

  it("ignores mass-mention callouts", () => {
    const message = {
      content: "@everyone <@bot-1> check in",
      channel: {
        isDMBased: () => false,
      },
      mentions: {
        everyone: true,
        has: (user: { id: string }) => user.id === "bot-1",
      },
    } as const;

    expect(getChatPrompt(message as never, client as never)).toBeNull();
  });
});
