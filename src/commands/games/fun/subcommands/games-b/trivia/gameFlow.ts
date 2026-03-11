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
import { logger } from "../../../../../../utils/logger.js";
import {
  getStats,
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
import { TRIVIA_QUESTION_TIMEOUT_MS } from "../../../../../../utils/constants.js";

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

function buildQuestionEmbed(
  question: TriviaQuestion,
  triviaId: string,
  allAnswers: string[],
): { embed: EmbedBuilder; buttons: ActionRowBuilder<ButtonBuilder> } {
  const points = DIFFICULTY_POINTS[question.difficulty];
  const emoji = CATEGORY_EMOJI[question.category];
  const categoryLabel = question.category.charAt(0).toUpperCase() + question.category.slice(1);
  const difficultyLabel = question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
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
        .setLabel(answer)
        .setStyle(ButtonStyle.Secondary),
    ),
  );
  return { embed, buttons };
}

export async function runTriviaGame(
  interaction: ChatInputCommandInteraction,
  categoryInput: TriviaCategory | null,
): Promise<void> {
  const question = getRandomQuestion(categoryInput ?? undefined);
  const allAnswers = shuffleArray([question.correctAnswer, ...question.wrongAnswers]);
  const triviaId = `trivia-${Date.now()}-${interaction.user.id}`;
  const userId = interaction.user.id;
  const points = DIFFICULTY_POINTS[question.difficulty];

  logger.info({ triviaId, userId, category: question.category }, "[trivia] game started");

  const { embed: questionEmbed, buttons } = buildQuestionEmbed(
    question,
    triviaId,
    allAnswers,
  );
  const emoji = CATEGORY_EMOJI[question.category];
  const categoryLabel =
    question.category.charAt(0).toUpperCase() + question.category.slice(1);
  const embedColor = CATEGORY_COLORS[question.category] ?? 0x6366f1;

  const message = await interaction.editReply({
    embeds: [questionEmbed],
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

    const resultEmbed = new EmbedBuilder()
      .setTitle(`${emoji} Trivia — ${categoryLabel}`)
      .setDescription(`**${question.question}**`)
      .setColor(embedColor);

    if (isCorrect) {
      recordCorrect(userId, points);
      logger.info({ triviaId, userId, points }, "[trivia] correct");
      const stats = getStats(interaction.user.id);

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

      resultEmbed.setFooter({ text: "See your stats: /fun trivia stats" });
      const nextRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("trivia-next")
          .setLabel("Next question")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("➡️"),
      );
      await response.update({
        embeds: [resultEmbed],
        components: [disabledButtons, nextRow],
      });
      await waitForNextQuestion(interaction, message, categoryInput, userId);
    } else {
      recordIncorrect(userId);
      logger.info({ triviaId, userId }, "[trivia] incorrect");

      resultEmbed.addFields({
        name: "❌ Wrong",
        value: `The answer was: **${question.correctAnswer}**\n💔 Streak reset!`,
        inline: false,
      });
      resultEmbed.setFooter({ text: "See your stats: /fun trivia stats" });
      const nextRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("trivia-next")
          .setLabel("Next question")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("➡️"),
      );
      await response.update({
        embeds: [resultEmbed],
        components: [disabledButtons, nextRow],
      });
      await waitForNextQuestion(interaction, message, categoryInput, userId);
    }
  } catch (err) {
    recordIncorrect(userId);
    logger.warn({ triviaId, userId, err }, "[trivia] timed out");

    const disabledButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      allAnswers.map((answer, i) =>
        new ButtonBuilder()
          .setCustomId(`${triviaId}:${i}`)
          .setLabel(answer)
          .setStyle(i === correctIndex ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true),
      ),
    );

    const timeoutEmbed = new EmbedBuilder()
      .setTitle(`${emoji} Trivia — ${categoryLabel}`)
      .setDescription(`**${question.question}**`)
      .addFields({
        name: "⏱️ Time's up!",
        value: `The answer was: **${question.correctAnswer}**`,
        inline: false,
      })
      .setColor(0x94a3b8);

    timeoutEmbed.setFooter({ text: "See your stats: /fun trivia stats" });
    await interaction.editReply({
      embeds: [timeoutEmbed],
      components: [disabledButtons],
    });
  }
}

async function waitForNextQuestion(
  interaction: ChatInputCommandInteraction,
  message: Message,
  categoryInput: TriviaCategory | null,
  userId: string,
): Promise<void> {
  try {
    const nextClick = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id && i.customId === "trivia-next",
      time: NEXT_QUESTION_TIMEOUT_MS,
    });
    await nextClick.deferUpdate();

    const question = getRandomQuestion(categoryInput ?? undefined);
    const allAnswers = shuffleArray([question.correctAnswer, ...question.wrongAnswers]);
    const triviaId2 = `trivia-${Date.now()}-${userId}`;
    const points = DIFFICULTY_POINTS[question.difficulty];
    const { embed: questionEmbed, buttons } = buildQuestionEmbed(
      question,
      triviaId2,
      allAnswers,
    );
    const emoji = CATEGORY_EMOJI[question.category];
    const categoryLabel =
      question.category.charAt(0).toUpperCase() + question.category.slice(1);
    const embedColor = CATEGORY_COLORS[question.category] ?? 0x6366f1;
    await message.edit({ embeds: [questionEmbed], components: [buttons] });

    const correctIndex = allAnswers.indexOf(question.correctAnswer);
    const response2 = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(triviaId2),
      time: TRIVIA_TIMEOUT_MS,
    });
    const selectedIndex = parseInt(response2.customId.split(":")[1], 10);
    const isCorrect = selectedIndex === correctIndex;
    const disabledButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      allAnswers.map((answer, i) =>
        new ButtonBuilder()
          .setCustomId(`${triviaId2}:${i}`)
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
    const resultEmbed = new EmbedBuilder()
      .setTitle(`${emoji} Trivia — ${categoryLabel}`)
      .setDescription(`**${question.question}**`)
      .setColor(embedColor);
    if (isCorrect) {
      recordCorrect(userId, points);
      const stats = getStats(interaction.user.id);
      resultEmbed.addFields(
        { name: "✅ Correct!", value: `**+${points}** points`, inline: true },
        { name: "🔥 Streak", value: `${stats.streak}`, inline: true },
        { name: "📊 Total", value: `${stats.points} pts`, inline: true },
      );
    } else {
      recordIncorrect(userId);
      resultEmbed.addFields({
        name: "❌ Wrong",
        value: `The answer was: **${question.correctAnswer}**`,
        inline: false,
      });
    }
    await response2.update({ embeds: [resultEmbed], components: [disabledButtons] });
  } catch {
    // Timeout or error — user didn't click Next; do nothing
  }
}
