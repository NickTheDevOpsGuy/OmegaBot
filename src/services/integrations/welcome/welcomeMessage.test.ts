import type { GuildMember } from "discord.js";
import { describe, expect, it } from "vitest";
import { AGREEMENTS_URL, buildWelcomeMessage } from "./welcomeMessage.js";

function mockMember(displayName: string, username = "fallback-user"): GuildMember {
  return {
    displayName,
    user: { username },
  } as unknown as GuildMember;
}

describe("buildWelcomeMessage", () => {
  it("includes the Agreements URL and onboarding hints", () => {
    const message = buildWelcomeMessage(mockMember("Nick"));

    expect(message).toContain(AGREEMENTS_URL);
    expect(message).toContain("/help <topic>");
    expect(message).toContain("Our docs and guides");
  });

  it("falls back to username when displayName is empty", () => {
    const message = buildWelcomeMessage(mockMember("", "nick-user"));

    expect(message).toContain("Welcome to OmegaBot, nick-user");
  });
});
