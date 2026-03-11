// src/commands/fun/subcommands/hangman/statsDisplay.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { getStats } from "./hangmanStats.js";

export async function runStats(interaction: ChatInputCommandInteraction): Promise<void> {
  const stats = getStats(interaction.user.id);
  const total = stats.wins + stats.losses;

  const lines = [
    `🎯 **Hangman Stats for ${interaction.user}**`,
    "",
    `Games: ${total} | Wins: ${stats.wins} | Losses: ${stats.losses}`,
    `Win Rate: ${stats.winRate}%`,
    `Total Guesses: ${stats.totalGuesses}`,
  ];
  if (stats.bestTimeSeconds != null) {
    lines.push(`⏱️ Fastest win: **${stats.bestTimeSeconds}s**`);
  }
  if (stats.averageTimeSeconds != null) {
    lines.push(`⏱️ Average win time: **${stats.averageTimeSeconds}s**`);
  }

  await interaction.editReply(lines.join("\n"));
}
