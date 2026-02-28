// src/commands/fun/subcommands/darts.ts
// Throw 3 darts at the board! Solo, PvP challenge, stats, leaderboards.

import type { ChatInputCommandInteraction } from "discord.js";
import { showStats, showLeaderboard } from "./darts/stats.js";
import { runSoloThrow } from "./darts/solo.js";
import { handleChallenge } from "./darts/challenge.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const opponent = interaction.options.getUser("opponent");
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const leaderboardView = interaction.options.getString("leaderboard");

  if (showStatsFlag) {
    await showStats(interaction, opponent ?? undefined);
    return;
  }

  if (
    leaderboardView === "best" ||
    leaderboardView === "180" ||
    leaderboardView === "pvp"
  ) {
    await showLeaderboard(interaction, leaderboardView);
    return;
  }

  if (opponent) {
    await handleChallenge(interaction, opponent);
    return;
  }

  await runSoloThrow(interaction);
}
