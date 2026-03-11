// src/utils/interactions.ts
// Helper utilities for interaction handling

import type { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

/**
 * Helper for commands that might take a while.
 * Shows "thinking..." state, then edits with result.
 */
export async function deferredReply(
  interaction: ChatInputCommandInteraction,
  handler: () => Promise<string | { embeds: EmbedBuilder[] } | { content: string }>,
): Promise<void> {
  await interaction.deferReply();

  try {
    const result = await handler();

    if (typeof result === "string") {
      await interaction.editReply({ content: result });
    } else {
      await interaction.editReply(result);
    }
  } catch (error) {
    await interaction.editReply({
      content: "❌ Something went wrong. Please try again.",
    });
    throw error;
  }
}

/**
 * Standard error reply format
 */
export async function errorReply(
  interaction: ChatInputCommandInteraction,
  message: string,
  suggestions?: string[],
): Promise<void> {
  const parts = [`❌ ${message}`];

  if (suggestions && suggestions.length > 0) {
    parts.push("");
    parts.push("💡 **Suggestions:**");
    suggestions.forEach((s) => parts.push(`• ${s}`));
  }

  const replied = interaction.replied || interaction.deferred;

  if (replied) {
    await interaction.editReply({ content: parts.join("\n") });
  } else {
    await interaction.reply({
      content: parts.join("\n"),
    });
  }
}
