// src/commands/help/helpText.test.ts
import { describe, expect, it } from "vitest";
import type { CommandListItem } from "../../../services/discord/discord/commandMeta.js";
import { buildHelpText, type HelpTopic } from "./helpText.js";

const TOPICS: HelpTopic[] = [
  "overview",
  "fun",
  "games",
  "profile",
  "quotes",
  "notion",
  "github",
  "status",
  "admin",
  "commands",
  "changelog",
  "summary",
  "info",
  "event",
];

describe("buildHelpText", () => {
  it("returns non-empty string for each topic (non-admin)", () => {
    const emptyCommands: CommandListItem[] = [];
    for (const topic of TOPICS) {
      const result = buildHelpText({
        isAdmin: false,
        commands: emptyCommands,
        topic,
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(20);
    }
  });

  it("returns non-empty string for each topic (admin)", () => {
    const emptyCommands: CommandListItem[] = [];
    for (const topic of TOPICS) {
      const result = buildHelpText({
        isAdmin: true,
        commands: emptyCommands,
        topic,
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(20);
    }
  });

  it("overview includes Getting Started", () => {
    const result = buildHelpText({
      isAdmin: false,
      commands: [],
      topic: "overview",
    });
    expect(result).toContain("Getting Started");
    expect(result).toContain("OmegaBot Help");
  });

  it("changelog includes version 3.9", () => {
    const result = buildHelpText({
      isAdmin: false,
      commands: [],
      topic: "changelog",
    });
    expect(result).toContain("3.9");
  });

  it("commands topic shows command list when provided", () => {
    const commands = [
      { name: "ping", description: "Health check", group: "core", adminOnly: false },
    ];
    const result = buildHelpText({
      isAdmin: false,
      commands,
      topic: "commands",
    });
    expect(result).toContain("/ping");
  });

  it("notion topic mentions wiki search", () => {
    const result = buildHelpText({
      isAdmin: false,
      commands: [],
      topic: "notion",
    });
    expect(result).toContain("/wiki");
    expect(result).toContain("/notion search");
    expect(result).toContain("/notion open");
    expect(result).toContain("/notion browse");
  });
});
