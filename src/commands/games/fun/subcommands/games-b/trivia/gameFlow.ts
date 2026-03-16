// src/commands/fun/subcommands/trivia/gameFlow.ts
// Trivia game loop: show question, collect answer, show result, optional next question.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type Message,
} from "discord.js";
import { getContextLogger } from "../../../../../../services/core/logging/requestContext.js";
import { logger } from "../../../../../../utils/logger.js";
import {
  getStats,
  getTriviaLeaderboard,
  recordCorrect,
  recordIncorrect,
} from "./triviaStore.js";
import {
  getRandomQuestion,
  shuffleArray,
  CATEGORY_EMOJI,
  DIFFICULTY_POINTS,
  type TriviaCategory,
} from "./questions.js";
import { safeMessageEdit } from "../../../../../../services/discord/discord/safeReply.js";
import { TRIVIA_QUESTION_TIMEOUT_MS } from "../../../../../../utils/constants.js";
import { getNewlyUnlockedAchievementLine } from "../../../../achievements/achievements.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import {
  buildMilestoneLine,
  buildRankTeaser,
  findLeaderboardRank,
} from "../../shared/gameFeedback.js";
import { awardXp } from "../../../../../../services/stores/progression/progressionStore.js";

const TRIVIA_TIMEOUT_MS = TRIVIA_QUESTION_TIMEOUT_MS;
const NEXT_QUESTION_TIMEOUT_MS = 60_000;

const CATEGORY_COLORS: Record<string, number> = {
  general: 0x6366f1,
  science: 0x22c55e,
  history: 0xf59e0b,
  geography: 0x0ea5e9,
  entertainment: 0xec4899,
  sports: 0x84cc16,
};

type TriviaQuestion = Awaited<ReturnType<typeof getRandomQuestion>>;

/** Discord button label: non-empty, max 80 chars, so buttons never show "Edit". */
function safeButtonLabel(answer: string, i: number): string {
  return (String(answer).trim() || `Option ${i + 1}`).slice(0, 80);
}

function buildQuestionEmbed(
  question: TriviaQuestion,
  triviaId: string,
  allAnswers: string[],
): { embed: EmbedBuilder; buttons: ActionRowBuilder<ButtonBuilder> } {
  const points = DIFFICULTY_POINTS[question.difficulty];
  const emoji = CATEGORY_EMOJI[question.category];
  const categoryLabel =
    question.category.charAt(0).toUpperCase() + question.category.slice(1);
  const difficultyLabel =
    question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
  const embedColor = CATEGORY_COLORS[question.category] ?? 0x6366f1;
  const embed = new EmbedBuilder()
    .setTitle(`${emoji} Trivia — ${categoryLabel}`)
    .setDescription(question.question)
    .addFields({ name: "⏱️ Time", value: "30 seconds", inline: true })
    .addFields({
      name: "🏆 At stake",
      value: `**${points}** points (${difficultyLabel})`,
      inline: true,
    })
    .setColor(embedColor);
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    allAnswers.map((answer, i) =>
      new ButtonBuilder()
        .setCustomId(`${triviaId}:${i}`)
        .setLabel(safeButtonLabel(answer, i))
        .setStyle(ButtonStyle.Secondary),
    ),
  );
  return { embed, buttons };
}

function buildTriviaResultComponents(
  triviaId: string,
  allAnswers: string[],
  correctIndex: number,
  selectedIndex: number | null,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    allAnswers.map((answer, i) =>
      new ButtonBuilder()
        .setCustomId(`${triviaId}:${i}`)
        .setLabel(safeButtonLabel(answer, i))
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
}

function buildNextQuestionRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("trivia-next")
      .setLabel("Next question")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("➡️"),
  );
}

async function playRound(
  interaction: ChatInputCommandInteraction,
  message: Message,
  categoryInput: TriviaCategory | null,
  userId: string,
): Promise<void> {
  const question = getRandomQuestion(categoryInput ?? undefined);
  const allAnswers = shuffleArray([question.correctAnswer, ...question.wrongAnswers]);
  const triviaId = `trivia-${Date.now()}-${userId}`;
  const points = DIFFICULTY_POINTS[question.difficulty];
  const { embed: questionEmbed, buttons } = buildQuestionEmbed(
    question,
    triviaId,
    allAnswers,
  );
  const emoji = CATEGORY_EMOJI[question.category];
  const categoryLabel =
    question.category.charAt(0).toUpperCase() + question.category.slice(1);
  const embedColor = CATEGORY_COLORS[question.category] ?? 0x6366f1;

  await safeMessageEdit(
    message,
    { embeds: [questionEmbed], components: [buttons] },
    "trivia.question",
    interaction,
  ).catch(() => {});

  const correctIndex = allAnswers.indexOf(question.correctAnswer);

  try {
    const response = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(triviaId),
      time: TRIVIA_TIMEOUT_MS,
    });

    const selectedIndex = parseInt(response.customId.split(":")[1], 10);
    const isCorrect = selectedIndex === correctIndex;
    const disabledButtons = buildTriviaResultComponents(
      triviaId,
      allAnswers,
      correctIndex,
      selectedIndex,
    );
    const resultEmbed = new EmbedBuilder()
      .setTitle(`${emoji} Trivia — ${categoryLabel}`)
      .setDescription(`**${question.question}**`)
      .setColor(embedColor);

    if (isCorrect) {
      const statsBefore = getStats(userId);
      let xpLine: string | undefined;
      const achievementLine = getNewlyUnlockedAchievementLine(userId, getDb(), () => {
        recordCorrect(userId, points);
        const xpResult = awardXp(userId, 10 + points * 2);
        xpLine = xpResult.leveledUp
          ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
          : `✨ +${xpResult.amount} XP`;
      });
      logger.info({ triviaId, userId, points }, "[trivia] correct");
      const stats = getStats(interaction.user.id);
      const milestoneLine = buildMilestoneLine(
        statsBefore.correct,
        stats.correct,
        [1, 10, 25, 50],
        "correct answers",
      );
      const rankLine = buildRankTeaser(
        findLeaderboardRank(getTriviaLeaderboard(25), (row) => row.userId === userId),
        "trivia",
      );

      resultEmbed.addFields(
        {
          name: "✅ Correct!",
          value: `**+${points}** points`,
          inline: true,
        },
        {
          name: "🔥 Streak",
          value: `${stats.streak}`,
          inline: true,
        },
        {
          name: "📊 Total",
          value: `${stats.points} pts`,
          inline: true,
        },
      );

      resultEmbed.setFooter({
        text: [
          milestoneLine,
          rankLine,
          xpLine,
          achievementLine,
          "See your stats: /fun trivia stats",
        ]
          .filter(Boolean)
          .join(" • "),
      });
    } else {
      recordIncorrect(userId);
      const xpResult = awardXp(userId, 4);
      logger.info({ triviaId, userId }, "[trivia] incorrect");

      resultEmbed.addFields({
        name: "❌ Wrong",
        value: `The answer was: **${question.correctAnswer}**\n💔 Streak broken. Tap **Next question** to start a new one.`,
        inline: false,
      });
      resultEmbed.setFooter({
        text: [
          xpResult.leveledUp
            ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
            : `✨ +${xpResult.amount} XP`,
          "See your stats: /fun trivia stats",
        ].join(" • "),
      });
    }

    await response.update({
      embeds: [resultEmbed],
      components: [disabledButtons, buildNextQuestionRow()],
    });

    try {
      const nextClick = await message.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id && i.customId === "trivia-next",
        time: NEXT_QUESTION_TIMEOUT_MS,
      });
      await nextClick.deferUpdate();
      await playRound(interaction, message, categoryInput, userId);
    } catch {
      // user stopped after seeing the result
    }
  } catch (err) {
    recordIncorrect(userId);
    const xpResult = awardXp(userId, 2);
    getContextLogger().warn({ triviaId, userId, err }, "[trivia] timed out");

    const disabledButtons = buildTriviaResultComponents(
      triviaId,
      allAnswers,
      correctIndex,
      null,
    );

    const timeoutEmbed = new EmbedBuilder()
      .setTitle(`${emoji} Trivia — ${categoryLabel}`)
      .setDescription(`**${question.question}**`)
      .addFields({
        name: "⏱️ Time's up!",
        value: `The answer was: **${question.correctAnswer}**\nTap **Next question** if you want another round.`,
        inline: false,
      })
      .setColor(0x94a3b8);

    timeoutEmbed.setFooter({
      text: [
        xpResult.leveledUp
          ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
          : `✨ +${xpResult.amount} XP`,
        "See your stats: /fun trivia stats",
      ].join(" • "),
    });
    await interaction.editReply({
      embeds: [timeoutEmbed],
      components: [disabledButtons, buildNextQuestionRow()],
    });

    try {
      const nextClick = await message.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id && i.customId === "trivia-next",
        time: NEXT_QUESTION_TIMEOUT_MS,
      });
      await nextClick.deferUpdate();
      await playRound(interaction, message, categoryInput, userId);
    } catch {
      // no next round requested
    }
  }
}

export async function runTriviaGame(
  interaction: ChatInputCommandInteraction,
  categoryInput: TriviaCategory | null,
): Promise<void> {
  const userId = interaction.user.id;
  logger.info({ userId, category: categoryInput ?? "random" }, "[trivia] game started");

  const message = await interaction.editReply({
    content: "Loading trivia...",
  });
  await playRound(interaction, message, categoryInput, userId);
}
