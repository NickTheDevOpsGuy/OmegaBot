// src/commands/config/rules.ts
// /config rules set/clear handler.

import { ChannelType, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { setGuildConfig } from "../../../services/core/config/guildConfigStore.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";

export async function handleRules(
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
      rulesChannelId: channel.id,
    });

    getContextLogger().info(
      { guildId: interaction.guildId, rulesChannelId: channel.id },
      "[config] rules channel set",
    );

    await interaction.reply({
      content: `✅ Rules channel set to <#${channel.id}>. Use \`/rules\` to link to it.`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (sub === "clear") {
    setGuildConfig(interaction.guildId!, {
      rulesChannelId: null,
    });

    getContextLogger().info({ guildId: interaction.guildId }, "[config] rules channel cleared");

    await interaction.reply({
      content: "✅ Rules channel cleared.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
