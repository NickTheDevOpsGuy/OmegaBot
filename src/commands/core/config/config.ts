// Server configuration command for admins.
//
// Subcommand groups:
// - /config view                    - View all server settings
// - /config welcome set/clear       - Configure welcome messages
// - /config starboard set/status/clear - Configure starboard
//
// Requires Manage Server permission.
// Handlers live in ./view, ./welcome, ./starboard, ./rules, ./moderatorRole.

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
  } else {
    await interaction.reply({
      content:
        "That option wasn't found. Use `rules`, `moderator-role`, or other config options. Use `/help` for more.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
