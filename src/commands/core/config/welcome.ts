// src/commands/config/welcome.ts
// /config welcome set/clear handler.

import { ChannelType, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { setGuildConfig } from "../../../services/core/config/guildConfigStore.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";

export async function handleWelcome(
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

    await setGuildConfig(interaction.guildId!, {
      welcomeChannelId: channel.id,
      welcomeEnabled: true,
    });

    getContextLogger().info(
      { guildId: interaction.guildId, welcomeChannelId: channel.id },
      "[config] welcome channel set",
    );

    await interaction.reply({
      content: `✅ Welcome messages will be posted in <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (sub === "clear") {
    await setGuildConfig(interaction.guildId!, {
      welcomeChannelId: null,
      welcomeEnabled: false,
    });

    getContextLogger().info(
      { guildId: interaction.guildId },
      "[config] welcome channel cleared",
    );

    await interaction.reply({
      content: "✅ Welcome channel cleared. Using system channel as fallback.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
