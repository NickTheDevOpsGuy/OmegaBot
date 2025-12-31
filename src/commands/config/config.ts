// src/commands/config/config.ts

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { setGuildConfig, getGuildConfig } from "../../services/config/guildConfigStore.js";
import { logger } from "../../utils/logger.js";

/**
 * Guild configuration command.
 *
 * This is intentionally small and focused:
 * - Set/clear the welcome channel for onboarding messages
 *
 * Notes:
 * - Requires "Manage Server" to prevent random users changing guild config
 * - Only allows guild text channels (not DMs, not threads)
 */
export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configure OmegaBot settings for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommandGroup((group) =>
    group
      .setName("welcome-channel")
      .setDescription("Configure where welcome messages are posted")
      .addSubcommand((sub) =>
        sub
          .setName("set")
          .setDescription("Set the channel used for welcome messages")
          .addChannelOption((opt) =>
            opt
              .setName("channel")
              .setDescription("Channel to post welcome messages in")
              .setRequired(true)
              // Only allow normal guild text channels.
              .addChannelTypes(ChannelType.GuildText),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName("clear").setDescription("Clear the configured welcome channel"),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // Only valid inside a guild.
  if (!interaction.guildId) {
    await interaction.reply({
      content: "This command can only be used in a server (not in DMs).",
      ephemeral: true,
    });
    return;
  }

  const group = interaction.options.getSubcommandGroup();
  const sub = interaction.options.getSubcommand();

  if (group !== "welcome-channel") {
    await interaction.reply({ content: "Unknown config group.", ephemeral: true });
    return;
  }

  if (sub === "set") {
    const channel = interaction.options.getChannel("channel", true);

    // Extra safety: ensure it’s a guild text channel.
    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "Please choose a normal text channel (not a thread or DM).",
        ephemeral: true,
      });
      return;
    }

    const updated = setGuildConfig(interaction.guildId, {
      welcomeChannelId: channel.id,
      welcomeEnabled: true,
    });

    logger.info(
      { guildId: interaction.guildId, welcomeChannelId: channel.id },
      "Updated guild welcome channel",
    );

    await interaction.reply({
      content: `✅ Welcome messages will be posted in <#${updated.welcomeChannelId}>.`,
      ephemeral: true,
    });
    return;
  }

  if (sub === "clear") {
    const current = getGuildConfig(interaction.guildId);

    // If nothing is set, still respond clearly.
    if (!current.welcomeChannelId) {
      await interaction.reply({
        content: "Welcome channel is already not set. I will use the system channel or first text channel as a fallback.",
        ephemeral: true,
      });
      return;
    }

    const updated = setGuildConfig(interaction.guildId, {
      welcomeChannelId: null,
    });

    logger.info({ guildId: interaction.guildId }, "Cleared guild welcome channel");

    await interaction.reply({
      content:
        "✅ Cleared the welcome channel. I will use the system channel or first text channel as a fallback.",
      ephemeral: true,
    });
  }
}