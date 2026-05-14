import { describe, expect, it } from "vitest";
import { useInMemoryDb } from "../../core/database/dbTestUtils.js";
import {
  addBannedWord,
  getAutomodSettings,
  listBannedWords,
  removeBannedWord,
  setAutomodSettings,
} from "./automodStore.js";
import {
  deleteCustomCommand,
  getCustomCommand,
  incrementCustomCommandUse,
  listCustomCommands,
  upsertCustomCommand,
} from "./customCommandStore.js";
import {
  addReactionRole,
  getReactionRole,
  listReactionRoles,
  removeReactionRole,
} from "./reactionRoleStore.js";
import {
  getSelfAssignableRole,
  listSelfAssignableRoles,
  removeSelfAssignableRole,
  upsertSelfAssignableRole,
} from "../roles/selfAssignableRoleStore.js";
import { addWarning, clearWarning, listWarnings } from "./warningsStore.js";

describe("server tools stores", () => {
  useInMemoryDb();

  it("stores automod settings and banned words", () => {
    expect(getAutomodSettings("guild1").enabled).toBe(false);

    const settings = setAutomodSettings("guild1", {
      enabled: true,
      blockLinks: true,
    });
    expect(settings.enabled).toBe(true);
    expect(settings.blockLinks).toBe(true);

    expect(addBannedWord("guild1", " Spoilers ", "mod1")).toBe("spoilers");
    expect(listBannedWords("guild1")).toEqual(["spoilers"]);
    expect(removeBannedWord("guild1", "spoilers")).toBe(true);
    expect(listBannedWords("guild1")).toEqual([]);
  });

  it("tracks active warnings", () => {
    const warning = addWarning({
      guildId: "guild1",
      userId: "user1",
      moderatorId: "mod1",
      reason: "Be cool",
    });

    expect(listWarnings("guild1", "user1")).toHaveLength(1);
    expect(clearWarning("guild1", warning.id)).toBe(true);
    expect(listWarnings("guild1", "user1")).toEqual([]);
  });

  it("manages custom commands", () => {
    const command = upsertCustomCommand({
      guildId: "guild1",
      name: "!Hello!",
      response: "Hi {user}",
      createdBy: "mod1",
    });

    expect(command.name).toBe("hello");
    incrementCustomCommandUse("guild1", "hello");
    expect(getCustomCommand("guild1", "hello")?.uses).toBe(1);
    expect(listCustomCommands("guild1")).toHaveLength(1);
    expect(deleteCustomCommand("guild1", "hello")).toBe(true);
    expect(getCustomCommand("guild1", "hello")).toBeNull();
  });

  it("manages reaction roles", () => {
    addReactionRole({
      guildId: "guild1",
      messageId: "message1",
      emoji: "✅",
      roleId: "role1",
      channelId: "channel1",
      createdBy: "mod1",
    });

    expect(getReactionRole("guild1", "message1", "✅")?.roleId).toBe("role1");
    expect(listReactionRoles("guild1")).toHaveLength(1);
    expect(removeReactionRole("guild1", "message1", "✅")).toBe(true);
    expect(getReactionRole("guild1", "message1", "✅")).toBeNull();
  });

  it("manages self-assignable roles", () => {
    upsertSelfAssignableRole({
      guildId: "guild1",
      roleId: "role1",
      description: "Events and announcements",
      createdBy: "mod1",
    });

    expect(getSelfAssignableRole("guild1", "role1")?.description).toBe(
      "Events and announcements",
    );
    expect(listSelfAssignableRoles("guild1")).toHaveLength(1);

    upsertSelfAssignableRole({
      guildId: "guild1",
      roleId: "role1",
      description: "Updated",
      createdBy: "mod2",
    });
    expect(listSelfAssignableRoles("guild1")).toHaveLength(1);
    expect(getSelfAssignableRole("guild1", "role1")?.description).toBe("Updated");

    expect(removeSelfAssignableRole("guild1", "role1")).toBe(true);
    expect(getSelfAssignableRole("guild1", "role1")).toBeNull();
  });
});
