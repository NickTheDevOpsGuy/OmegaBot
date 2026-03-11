// src/commands/fun/subcommands/darts/stats.ts
import type { ChatInputCommandInteraction, User } from "discord.js";
import {
  getStats,
  getBestRoundLeaderboard,
  get180Leaderboard,
  getPvpWinsLeaderboard,
  getPvpStats,
} from "./dartsStore.js";

export async function showStats(
  interaction: ChatInputCommandInteraction,
  targetUser?: User,
): Promise<void> {
  const user = targetUser ?? interaction.user;
  const solo = getStats(user.id);
  const pvp = getPvpStats(user.id);

  const lines: string[] = [
    `🎯 **Darts Stats for ${user}**`,
    "",
    "**Solo**",
    `Throws: ${solo.throws} | Best round: ${solo.bestRound} | 180s: ${solo.count180}`,
    "",
    "**PvP**",
    `Games: ${pvp.total} | Wins: ${pvp.wins} | Losses: ${pvp.losses} | Ties: ${pvp.ties}`,
    `Win rate: ${pvp.winRate}%`,
  ];

  await interaction.editReply(lines.join("\n"));
}

export async function showLeaderboard(
  interaction: ChatInputCommandInteraction,
  view: "best" | "180" | "pvp",
): Promise<void> {
  if (view === "best") {
    const leaders = getBestRoundLeaderboard(10);
    if (leaders.length === 0) {
      await interaction.editReply("No best rounds recorded yet! Throw some darts!");
      return;
    }
    const lines = leaders.map(
      (l, i) => `${i + 1}. <@${l.user_id}> – **${l.best_round}**`,
    );
    await interaction.editReply(
      ["🎯 **Best Round Leaderboard**", "", ...lines].join("\n"),
    );
  } else if (view === "180") {
    const leaders = get180Leaderboard(10);
    if (leaders.length === 0) {
      await interaction.editReply("No 180s hit yet! Keep throwing!");
      return;
    }
    const lines = leaders.map(
      (l, i) =>
        `${i + 1}. <@${l.user_id}> – **${l.count_180}** 180${l.count_180 === 1 ? "" : "s"}`,
    );
    await interaction.editReply(["🎯 **180 Leaderboard**", "", ...lines].join("\n"));
  } else {
    const leaders = getPvpWinsLeaderboard(10);
    if (leaders.length === 0) {
      await interaction.editReply("No PvP wins yet! Challenge someone!");
      return;
    }
    const lines = leaders.map(
      (l, i) => `${i + 1}. <@${l.user_id}> – **${l.wins}** win${l.wins === 1 ? "" : "s"}`,
    );
    await interaction.editReply(
      ["🎯 **Darts PvP Wins Leaderboard**", "", ...lines].join("\n"),
    );
  }
}
