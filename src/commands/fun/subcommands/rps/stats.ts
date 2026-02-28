// src/commands/fun/subcommands/rps/stats.ts
import type { ChatInputCommandInteraction, User } from "discord.js";
import { getSoloStats, getPvpStats } from "../rpsStore.js";

export async function showStats(
  interaction: ChatInputCommandInteraction,
  targetUser?: User,
): Promise<void> {
  const user = targetUser ?? interaction.user;
  const soloStats = getSoloStats(user.id);
  const pvpStats = getPvpStats(user.id);

  const lines: string[] = [];
  lines.push(`✊✋✌️ **RPS Stats for ${user}**`);
  lines.push("");
  lines.push("**vs Bot:**");
  lines.push(
    `Games: ${soloStats.total} | Wins: ${soloStats.wins} | Losses: ${soloStats.losses} | Ties: ${soloStats.ties}`,
  );
  lines.push(`Win Rate: ${soloStats.winRate}%`);
  lines.push("");
  lines.push("**vs Players:**");
  lines.push(
    `Games: ${pvpStats.total} | Wins: ${pvpStats.wins} | Losses: ${pvpStats.losses} | Ties: ${pvpStats.ties}`,
  );
  lines.push(`Win Rate: ${pvpStats.winRate}%`);

  await interaction.editReply(lines.join("\n"));
}
