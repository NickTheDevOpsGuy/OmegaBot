// src/commands/fun/subcommands/trivia.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { errMessage, getUserFacingReason } from "../../../../../../utils/errors.js";
import { logger } from "../../../../../../utils/logger.js";
import { getStats, getTriviaLeaderboard } from "./triviaStore.js";
import type { TriviaCategory } from "./questions.js";
import { runTriviaGame } from "./gameFlow.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    return await runTrivia(interaction);
  } catch (err) {
    logger.error(
      { err, userId: interaction.user.id },
      `[trivia] trivia handler threw: ${errMessage(err)}`,
    );
    await interaction
      .editReply(`❌ Trivia couldn't load or continue: ${getUserFacingReason(err)}`)
      .catch(() => {});
  }
}

async function runTrivia(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStats = interaction.options.getBoolean("stats") ?? false;
  const showLeaderboard = interaction.options.getBoolean("leaderboard") ?? false;
  const categoryInput = interaction.options.getString(
    "category",
  ) as TriviaCategory | null;

  if (showStats) {
    const stats = getStats(interaction.user.id);
    const lines = [
      `🧠 **Trivia Stats for ${interaction.user}**`,
      "",
      `📊 **Score:** ${stats.points} points`,
      `✅ Correct: ${stats.correct}`,
      `❌ Incorrect: ${stats.incorrect}`,
      `🎯 Accuracy: ${stats.accuracy}%`,
      `🔥 Current Streak: ${stats.streak}`,
      `⭐ Best Streak: ${stats.bestStreak}`,
    ];
    await interaction.editReply(lines.join("\n"));
    return;
  }

  if (showLeaderboard) {
    const leaders = getTriviaLeaderboard(10);

    if (leaders.length === 0) {
      await interaction.editReply(
        "🧠 **Trivia Leaderboard**\n\nNo trivia played yet! Be the first with `/fun trivia`",
      );
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = ["🧠 **Trivia Leaderboard**", ""];

    leaders.forEach((l, i) => {
      const prefix = medals[i] ?? `${i + 1}.`;
      lines.push(
        `${prefix} <@${l.userId}> — ${l.points} pts (${l.correct} correct, best streak: ${l.bestStreak})`,
      );
    });

    await interaction.editReply(lines.join("\n"));
    return;
  }

  await runTriviaGame(interaction, categoryInput);
}
