// src/commands/fun/subcommands/trivia.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  getStats,
  recordCorrect,
  recordIncorrect,
  getTriviaLeaderboard,
} from "./triviaStore.js";
import {
  getRandomQuestion,
  shuffleArray,
  CATEGORY_EMOJI,
  DIFFICULTY_POINTS,
  type TriviaCategory,
} from "./trivia/questions.js";

const TRIVIA_TIMEOUT_MS = 30_000; // 30 seconds

/* -------------------------------------------------------------------------- */
/* Command handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
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

  const question = getRandomQuestion(categoryInput ?? undefined);
  const allAnswers = shuffleArray([question.correctAnswer, ...question.wrongAnswers]);
  const triviaId = `trivia-${Date.now()}-${interaction.user.id}`;

  const points = DIFFICULTY_POINTS[question.difficulty];
  const emoji = CATEGORY_EMOJI[question.category];

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    allAnswers.map((answer, i) =>
      new ButtonBuilder()
        .setCustomId(`${triviaId}:${i}`)
        .setLabel(answer)
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  const message = await interaction.editReply({
    content: [
      `${emoji} **Trivia** — ${question.category.charAt(0).toUpperCase() + question.category.slice(1)} (${question.difficulty})`,
      "",
      `**${question.question}**`,
      "",
      `⏱️ You have 30 seconds! Worth **${points} points**`,
    ].join("\n"),
    components: [buttons],
  });

  const correctIndex = allAnswers.indexOf(question.correctAnswer);

  try {
    const response = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(triviaId),
      time: TRIVIA_TIMEOUT_MS,
    });

    const selectedIndex = parseInt(response.customId.split(":")[1], 10);
    const isCorrect = selectedIndex === correctIndex;

    const disabledButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      allAnswers.map((answer, i) =>
        new ButtonBuilder()
          .setCustomId(`${triviaId}:${i}`)
          .setLabel(answer)
          .setStyle(
            i === correctIndex
              ? ButtonStyle.Success
              : i === selectedIndex
                ? ButtonStyle.Danger
                : ButtonStyle.Secondary,
          )
          .setDisabled(true),
      ),
    );

    if (isCorrect) {
      recordCorrect(interaction.user.id, points);
      const stats = getStats(interaction.user.id);

      await response.update({
        content: [
          `${emoji} **Trivia** — ${question.category.charAt(0).toUpperCase() + question.category.slice(1)} (${question.difficulty})`,
          "",
          `**${question.question}**`,
          "",
          `✅ **Correct!** +${points} points`,
          `🔥 Streak: ${stats.streak} | Total: ${stats.points} pts`,
        ].join("\n"),
        components: [disabledButtons],
      });
    } else {
      recordIncorrect(interaction.user.id);

      await response.update({
        content: [
          `${emoji} **Trivia** — ${question.category.charAt(0).toUpperCase() + question.category.slice(1)} (${question.difficulty})`,
          "",
          `**${question.question}**`,
          "",
          `❌ **Wrong!** The answer was: **${question.correctAnswer}**`,
          `💔 Streak reset!`,
        ].join("\n"),
        components: [disabledButtons],
      });
    }
  } catch {
    const disabledButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      allAnswers.map((answer, i) =>
        new ButtonBuilder()
          .setCustomId(`${triviaId}:${i}`)
          .setLabel(answer)
          .setStyle(i === correctIndex ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true),
      ),
    );

    recordIncorrect(interaction.user.id);

    await interaction.editReply({
      content: [
        `${emoji} **Trivia** — ${question.category.charAt(0).toUpperCase() + question.category.slice(1)} (${question.difficulty})`,
        "",
        `**${question.question}**`,
        "",
        `⏱️ **Time's up!** The answer was: **${question.correctAnswer}**`,
      ].join("\n"),
      components: [disabledButtons],
    });
  }
}
