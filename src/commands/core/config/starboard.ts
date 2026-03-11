// src/commands/config/starboard.ts
// /config starboard set/status/clear handler.

import { ChannelType, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { setGuildConfig, getGuildConfig } from "../../../services/core/config/guildConfigStore.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";

export async function handleStarboard(
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

    getContextLogger().info(
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

    getContextLogger().info({ guildId: interaction.guildId }, "[config] starboard disabled");

    await interaction.reply({
      content: "✅ Starboard disabled.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
