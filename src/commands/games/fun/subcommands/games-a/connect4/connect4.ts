// src/commands/fun/subcommands/connect4.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { getStats } from "./connect4Store.js";
import { runPvP } from "./pvp.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const opponent = interaction.options.getUser("user");

  if (showStatsFlag) {
    const stats = getStats(interaction.user.id);
    const total = stats.wins + stats.losses + stats.ties;

    await interaction.editReply(
      [
        `🔴🟡 **Connect 4 Stats for ${interaction.user}**`,
        "",
        `Games: ${total} | Wins: ${stats.wins} | Losses: ${stats.losses} | Ties: ${stats.ties}`,
        `Win Rate: ${stats.winRate}%`,
      ].join("\n"),
    );
    return;
  }

  const p1 = interaction.user;
  const p2 = opponent && opponent.id !== p1.id ? opponent : null;

  if (!p2) {
    await interaction.editReply(
      "Connect 4 needs an opponent. Use: `/fun connect4 user:@someone`",
    );
    return;
  }

  if (p2.bot) {
    await interaction.editReply("You can't play against a bot!");
    return;
  }

  await runPvP(interaction, p1, p2);
}
