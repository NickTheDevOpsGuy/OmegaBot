// src/utils/interactions.ts
// Helper utilities for interaction handling

import type { ChatInputCommandInteraction } from "discord.js";

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
