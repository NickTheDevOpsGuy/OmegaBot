// src/commands/config/welcome.ts
// /config welcome set/clear handler.

import {
  ChannelType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { setGuildConfig } from "../../../services/core/config/guildConfigStore.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";

const FROM_ZERO_WIKI_URL =
  "https://www.notion.so/From-Zero-Wiki-303c98a25b2381088fdec934ed15897a?source=copy_link";

export function buildWelcomeMessage(userId: string): string {
  return [
    `Welcome <@${userId}> to Zero → Hero.`,
    "",
    "This is a build-in-public space for learning by doing.",
    "",
    "Here you can:",
    "- Read up on topics in the From-Zero-Wiki",
    "- Share your projects",
    "- Ask for help when you get stuck",
    "- Post experiments, bugs, wins, and lessons learned",
    "",
    "Start here:",
    "From-Zero-Wiki",
    FROM_ZERO_WIKI_URL,
    "",
    "The goal is simple:",
    "Pick something small. Build it. Break it. Fix it. Share what you learned.",
    "",
    "Glad you're here.",
  ].join("\n");
}

export async function sendWelcomeMessage(
  channel: TextChannel,
  userId: string,
): Promise<void> {
  await channel.send({
    content: buildWelcomeMessage(userId),
  });
}

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
  }
}
