import { describe, expect, it } from "vitest";
import {
  appendSafetyFollowup,
  buildConversationSystemPrompt,
  detectDistressLevel,
} from "./chatService.js";

describe("chatService supportive behavior", () => {
  it("detects supportive distress language", () => {
    expect(detectDistressLevel("I've been really overwhelmed and anxious lately")).toBe(
      "support",
    );
  });

  it("detects crisis language", () => {
    expect(detectDistressLevel("I want to kill myself")).toBe("crisis");
  });

  it("builds a prompt with mode and memory", () => {
    const prompt = buildConversationSystemPrompt({
      mode: "grounding",
      memorySummary: "- The user has been stressed about work.",
      distressLevel: "support",
    });
    expect(prompt).toContain("grounding");
    expect(prompt).toContain("stressed about work");
  });

  it("adds a crisis followup when needed", () => {
    const safe = appendSafetyFollowup("I'm really sorry you're hurting.", "crisis");
    expect(safe).toMatch(/988|crisis|emergency/i);
  });
});
