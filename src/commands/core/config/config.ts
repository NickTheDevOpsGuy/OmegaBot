// Server configuration command for admins.
//
// Subcommand groups:
// - /config view                    - View all server settings
// - /config welcome set/clear/set-message/message/reset-message/test - Configure welcome messages
// - /config starboard set/status/clear - Configure starboard
// - /config leveling ...            - Configure message XP leveling
//
// Requires Manage Server permission.
// Handlers live in ./view, ./welcome, ./starboard, ./rules, ./moderatorRole, ./leveling.

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { t, resolveLocale } from "../../../i18n/index.js";
import { handleView } from "./view.js";
import { handleWelcome } from "./welcome.js";
import { handleStarboard } from "./starboard.js";
import { handleRules } from "./rules.js";
import { handleModeratorRole } from "./moderatorRole.js";
import { handleLeveling } from "./leveling.js";

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configure OmegaBot settings for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  // Welcome channel
  .addSubcommandGroup((group) =>
    group
      .setName("welcome")
      .setDescription("Configure welcome messages")
      .addSubcommand((sub) =>
        sub
          .setName("set")
          .setDescription("Set the welcome channel")
          .addChannelOption((opt) =>
            opt
              .setName("channel")
              .setDescription("Channel for welcome messages")
              .setRequired(true)
              .addChannelTypes(ChannelType.GuildText),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName("clear").setDescription("Clear the welcome channel"),
      )
      .addSubcommand((sub) =>
        sub
          .setName("message")
          .setDescription("Set the welcome message text")
          .addStringOption((opt) =>
            opt
              .setName("text")
              .setDescription(
                "Message text. Supports {user}, {name}, {username}, and {server}.",
              )
              .setRequired(true)
              .setMinLength(1)
              .setMaxLength(1800),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName("set-message")
          .setDescription("Set the welcome message text")
          .addStringOption((opt) =>
            opt
              .setName("text")
              .setDescription(
                "Message text. Supports {user}, {name}, {username}, and {server}.",
              )
              .setRequired(true)
              .setMinLength(1)
              .setMaxLength(1800),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName("reset-message").setDescription("Use the default welcome message"),
      )
      .addSubcommand((sub) =>
        sub.setName("test").setDescription("Send a test welcome message"),
      ),
  )
  // Starboard
  .addSubcommandGroup((group) =>
    group
      .setName("starboard")
      .setDescription("Configure the starboard")
      .addSubcommand((sub) =>
        sub
          .setName("set")
          .setDescription("Set up the starboard")
          .addChannelOption((opt) =>
            opt
              .setName("channel")
              .setDescription("Channel for starred messages")
              .setRequired(true)
              .addChannelTypes(ChannelType.GuildText),
          )
          .addIntegerOption((opt) =>
            opt
              .setName("threshold")
              .setDescription("Stars required (default 3)")
              .setMinValue(1)
              .setMaxValue(25),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName("status").setDescription("View current starboard settings"),
      )
      .addSubcommand((sub) =>
        sub.setName("clear").setDescription("Disable the starboard"),
      ),
  )
  // Rules
  .addSubcommandGroup((group) =>
    group
      .setName("rules")
      .setDescription("Set the channel where server rules are posted")
      .addSubcommand((sub) =>
        sub
          .setName("set")
          .setDescription("Set the rules channel")
          .addChannelOption((opt) =>
            opt
              .setName("channel")
              .setDescription("Channel containing server rules")
              .setRequired(true)
              .addChannelTypes(ChannelType.GuildText),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName("clear").setDescription("Clear the rules channel"),
      ),
  )
  // Moderator role (for /admin)
  .addSubcommandGroup((group) =>
    group
      .setName("moderator-role")
      .setDescription("Roles that can use /admin moderation (timeout, kick, ban)")
      .addSubcommand((sub) =>
        sub
          .setName("add")
          .setDescription("Add a moderator role")
          .addRoleOption((opt) =>
            opt.setName("role").setDescription("Role to add").setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName("remove")
          .setDescription("Remove a moderator role")
          .addRoleOption((opt) =>
            opt.setName("role").setDescription("Role to remove").setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName("list").setDescription("List moderator roles for this server"),
      ),
  )
  // MEE6-style message XP leveling
  .addSubcommandGroup((group) =>
    group
      .setName("leveling")
      .setDescription("Configure message XP, rank announcements, and role rewards")
      .addSubcommand((sub) =>
        sub.setName("enable").setDescription("Enable message XP leveling"),
      )
      .addSubcommand((sub) =>
        sub.setName("disable").setDescription("Disable message XP leveling"),
      )
      .addSubcommand((sub) =>
        sub
          .setName("announce-channel")
          .setDescription("Set or clear the channel for level-up announcements")
          .addChannelOption((opt) =>
            opt
              .setName("channel")
              .setDescription("Announcement channel; omit to use the active channel")
              .setRequired(false)
              .addChannelTypes(ChannelType.GuildText),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName("role-add")
          .setDescription("Give a role when members reach a level")
          .addIntegerOption((opt) =>
            opt
              .setName("level")
              .setDescription("Level that unlocks this role")
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(500),
          )
          .addRoleOption((opt) =>
            opt.setName("role").setDescription("Reward role").setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName("role-remove")
          .setDescription("Remove a level role reward")
          .addIntegerOption((opt) =>
            opt
              .setName("level")
              .setDescription("Level reward to remove")
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(500),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName("status").setDescription("View leveling settings"),
      ),
  )
  // View all settings
  .addSubcommand((sub) =>
    sub.setName("view").setDescription("View all current settings"),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
    await interaction.reply({
      content: t("common.guild_only", locale),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  if (!group && sub === "view") {
    await handleView(interaction);
    return;
  }

  if (group === "welcome") {
    await handleWelcome(interaction, sub);
  } else if (group === "starboard") {
    await handleStarboard(interaction, sub);
  } else if (group === "rules") {
    await handleRules(interaction, sub);
  } else if (group === "moderator-role") {
    await handleModeratorRole(interaction, sub);
  } else if (group === "leveling") {
    await handleLeveling(interaction, sub);
  } else {
    await interaction.reply({
      content:
        "That option wasn't found. Use `rules`, `moderator-role`, `leveling`, or other config options. Use `/help` for more.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
