// src/commands/fun/subcommands/tictactoe.ts
import type { ChatInputCommandInteraction, User } from "discord.js";
import { getStats } from "./tictactoeStore.js";
import { playVsBot } from "./tictactoe/vsBot.js";
import { playVsPlayer } from "./tictactoe/vsPlayer.js";

async function showStats(
  interaction: ChatInputCommandInteraction,
  targetUser?: User,
): Promise<void> {
  const user = targetUser ?? interaction.user;
  const stats = getStats(user.id);

  const lines = [
    `🎮 **Tic Tac Toe Stats for ${user}**`,
    "",
    `📊 **Overall**`,
    `Games: ${stats.total} | Wins: ${stats.wins} | Losses: ${stats.losses} | Ties: ${stats.ties}`,
    `Win Rate: ${stats.winRate}%`,
  ];

  await interaction.editReply(lines.join("\n"));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const opponent = interaction.options.getUser("opponent");

  if (showStatsFlag) {
    await showStats(interaction, opponent ?? undefined);
    return;
  }

  if (opponent) {
    await playVsPlayer(interaction, opponent);
  } else {
    await playVsBot(interaction);
  }
}
