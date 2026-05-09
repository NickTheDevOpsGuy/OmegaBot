// src/commands/config/welcome.ts
// /config welcome set/clear handler.

import {
  ChannelType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { setGuildConfig } from "../../../services/core/config/guildConfigStore.js";
import { sendWelcomeMessageForMember } from "../../../services/integrations/welcome/welcomeHandler.js";
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
      welcomeEnabled: true,
    });

    getContextLogger().info(
      { guildId: interaction.guildId },
      "[config] welcome channel cleared",
    );

    await interaction.reply({
      content: "✅ Welcome channel cleared. Using system channel as fallback.",
      flags: MessageFlags.Ephemeral,
    });
  } else if (sub === "test") {
    const member = await interaction.guild?.members
      .fetch(interaction.user.id)
      .catch((): null => null);

    if (!member) {
      await interaction.reply({
        content: "I couldn't resolve your server member record to build a test welcome.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const result = await sendWelcomeMessageForMember(
        member as GuildMember,
        "config-test",
      );

      if (result.sent) {
        await interaction.reply({
          content: result.channelId
            ? `✅ Test welcome sent to <#${result.channelId}>.`
            : "✅ Test welcome sent.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply({
        content:
          result.reason === "not-sendable"
            ? "I found a welcome channel, but it is not sendable."
            : "I could not resolve a welcome channel. Use `/config welcome set` or set a server system channel.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      getContextLogger().error(
        { err, guildId: interaction.guildId },
        "[config] welcome test threw",
      );

      await interaction.reply({
        content:
          "I found the welcome path, but Discord rejected the send. Check my channel permissions for View Channel and Send Messages.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
