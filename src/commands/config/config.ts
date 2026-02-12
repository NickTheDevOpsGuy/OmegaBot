// src/commands/config/config.ts
//
// Server configuration command for admins.
//
// Subcommand groups:
// - /config view                    - View all server settings
// - /config welcome set/clear       - Configure welcome messages
// - /config starboard set/status/clear - Configure starboard
//
// Requires Manage Server permission.
// This consolidates the old /starboard command into /config.

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  setGuildConfig,
  getGuildConfig,
} from "../../services/config/guildConfigStore.js";
import { logger } from "../../utils/logger.js";

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
  // View all settings
  .addSubcommand((sub) =>
    sub.setName("view").setDescription("View all current settings"),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  // /config view (no group)
  if (!group && sub === "view") {
    await handleView(interaction);
    return;
  }

  if (group === "welcome") {
    await handleWelcome(interaction, sub);
  } else if (group === "starboard") {
    await handleStarboard(interaction, sub);
  } else {
    await interaction.reply({
      content: "Unknown config option.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* View Handler                                                                */
/* -------------------------------------------------------------------------- */

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
  const config = getGuildConfig(interaction.guildId!);

  const embed = new EmbedBuilder().setTitle("⚙️ Server Configuration").setColor(0x5865f2);

  // Welcome
  const welcomeStatus = config.welcomeChannelId
    ? `✅ Enabled - <#${config.welcomeChannelId}>`
    : "❌ Not configured";

  embed.addFields({
    name: "👋 Welcome Messages",
    value: welcomeStatus,
    inline: false,
  });

  // Starboard
  const starboardStatus = config.starboardChannelId
    ? `✅ Enabled - <#${config.starboardChannelId}> (${config.starboardThreshold ?? 3}⭐ required)`
    : "❌ Not configured";

  embed.addFields({
    name: "⭐ Starboard",
    value: starboardStatus,
    inline: false,
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/* -------------------------------------------------------------------------- */
/* Welcome Handler                                                             */
/* -------------------------------------------------------------------------- */

async function handleWelcome(
  interaction: ChatInputCommandInteraction,
  sub: string,
): Promise<void> {
  if (sub === "set") {
    const channel = interaction.options.getChannel("channel", true);

    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "Please choose a text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    setGuildConfig(interaction.guildId!, {
      welcomeChannelId: channel.id,
      welcomeEnabled: true,
    });

    logger.info(
      { guildId: interaction.guildId, welcomeChannelId: channel.id },
      "[config] welcome channel set",
    );

    await interaction.reply({
      content: `✅ Welcome messages will be posted in <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (sub === "clear") {
    setGuildConfig(interaction.guildId!, {
      welcomeChannelId: null,
      welcomeEnabled: false,
    });

    logger.info({ guildId: interaction.guildId }, "[config] welcome channel cleared");

    await interaction.reply({
      content: "✅ Welcome channel cleared. Using system channel as fallback.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Starboard Handler                                                           */
/* -------------------------------------------------------------------------- */

async function handleStarboard(
  interaction: ChatInputCommandInteraction,
  sub: string,
): Promise<void> {
  if (sub === "set") {
    const channel = interaction.options.getChannel("channel", true);
    const threshold = interaction.options.getInteger("threshold") ?? 3;

    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "Please choose a text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    setGuildConfig(interaction.guildId!, {
      starboardChannelId: channel.id,
      starboardThreshold: threshold,
    });

    logger.info(
      { guildId: interaction.guildId, starboardChannelId: channel.id, threshold },
      "[config] starboard configured",
    );

    await interaction.reply({
      content: `✅ Starboard configured!\n• Channel: <#${channel.id}>\n• Threshold: ${threshold}⭐`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (sub === "status") {
    const config = getGuildConfig(interaction.guildId!);

    if (!config.starboardChannelId) {
      await interaction.reply({
        content:
          "⭐ Starboard is not configured.\nUse `/config starboard set` to enable it.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: `⭐ **Starboard Status**\n• Channel: <#${config.starboardChannelId}>\n• Threshold: ${config.starboardThreshold ?? 3}⭐`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (sub === "clear") {
    setGuildConfig(interaction.guildId!, {
      starboardChannelId: null,
      starboardThreshold: 3,
    });

    logger.info({ guildId: interaction.guildId }, "[config] starboard disabled");

    await interaction.reply({
      content: "✅ Starboard disabled.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
