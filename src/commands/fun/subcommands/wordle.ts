// src/commands/fun/subcommands/wordle.ts
//
// Daily Wordle word puzzle - same word for everyone each day.
//
// Features:
// - 200+ word dictionary
// - Daily puzzle based on date seed
// - Modal input for guesses
// - Color feedback: 🟩 correct, 🟨 present, ⬛ absent
// - Streak tracking
// - Guess distribution stats
// - Resume incomplete games
//
// Stats are persisted to wordle_games and wordle_stats tables.

import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import {
  getStats,
  getTodayGame,
  saveGame,
  MAX_GUESSES,
  WORD_LENGTH,
} from "./wordleStore.js";
import { getTodayWord } from "./wordle/gameLogic.js";
import { buildGameMessage, buildGuessButton } from "./wordle/ui.js";
import { safeMessageEdit } from "../../../services/discord/safeReply.js";

/* -------------------------------------------------------------------------- */
/* Command Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;

  if (showStatsFlag) {
    const stats = getStats(interaction.user.id);

    const distLines =
      Object.entries(stats.guessDistribution)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(
          ([guesses, count]) => `${guesses}: ${"█".repeat(Math.min(count, 20))} ${count}`,
        )
        .join("\n") || "No wins yet";

    await interaction.editReply(
      [
        `🟩 **Wordle Stats for ${interaction.user}**`,
        "",
        `Played: ${stats.played} | Won: ${stats.won} (${stats.winRate}%)`,
        `Current Streak: ${stats.currentStreak} | Best: ${stats.maxStreak}`,
        "",
        "**Guess Distribution:**",
        distLines,
      ].join("\n"),
    );
    return;
  }

  const word = getTodayWord();
  const existingGame = getTodayGame(interaction.user.id);

  if (existingGame) {
    const status = existingGame.won
      ? "won"
      : existingGame.guesses.length >= MAX_GUESSES
        ? "lost"
        : "playing";
    await interaction.editReply({
      content:
        buildGameMessage(existingGame.guesses, word, status) +
        "\n\n*Continuing your game...*",
      components: status === "playing" ? [buildGuessButton(`${Date.now()}`)] : [],
    });

    if (status !== "playing") return;
  }

  const gameId = `${Date.now()}-${interaction.user.id}`;
  const userId = interaction.user.id;
  const guesses: string[] = existingGame?.guesses ?? [];

  logger.info({ gameId, userId }, "[wordle] game started");

  const message = await interaction.editReply({
    content: buildGameMessage(guesses, word, "playing"),
    components: [buildGuessButton(gameId)],
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 3_600_000, // 1 hour
    filter: (i) =>
      i.user.id === interaction.user.id && i.customId.startsWith(`wordle:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction) => {
    const action = buttonInteraction.customId.split(":")[2];
    if (action === "extend") {
      collector.resetTimer();
      await buttonInteraction.deferUpdate();
      await interaction.editReply({
        content:
          buildGameMessage(guesses, word, "playing") +
          "\n\n⏱️ *Time extended! You have another hour.*",
        components: [buildGuessButton(gameId)],
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`wordle-modal:${gameId}`)
      .setTitle("Wordle - Enter Your Guess")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("guess")
            .setLabel("Your 5-letter guess")
            .setStyle(TextInputStyle.Short)
            .setMinLength(5)
            .setMaxLength(5)
            .setPlaceholder("Enter a 5-letter word")
            .setRequired(true),
        ),
      );

    await buttonInteraction.showModal(modal);

    try {
      const modalSubmit = await buttonInteraction.awaitModalSubmit({
        time: 60_000,
        filter: (i) => i.customId === `wordle-modal:${gameId}`,
      });

      const guess = modalSubmit.fields.getTextInputValue("guess").toLowerCase().trim();

      if (guess.length !== WORD_LENGTH || !/^[a-z]+$/.test(guess)) {
        await modalSubmit.reply({
          content: "Please enter a valid 5-letter word!",
          ephemeral: true,
        });
        return;
      }

      guesses.push(guess);

      const won = guess === word;
      const lost = !won && guesses.length >= MAX_GUESSES;

      if (won || lost) {
        collector.stop(won ? "won" : "lost");
        saveGame(userId, guesses, won, word);
        logger.info(
          { gameId, userId, won, guesses: guesses.length },
          "[wordle] game ended",
        );

        await modalSubmit.deferUpdate();
        await interaction.editReply({
          content: buildGameMessage(guesses, word, won ? "won" : "lost"),
          components: [buildGuessButton(gameId, true)],
        });
        return;
      }

      saveGame(userId, guesses, false, word);

      await modalSubmit.deferUpdate();
      await interaction.editReply({
        content: buildGameMessage(guesses, word, "playing"),
        components: [buildGuessButton(gameId)],
      });
    } catch (err) {
      logger.debug({ err }, "[wordle] modal timeout or error");
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time" && guesses.length < MAX_GUESSES) {
      logger.warn({ gameId, userId }, "[wordle] session expired");
      await safeMessageEdit(
        message,
        {
          content:
            buildGameMessage(guesses, word, "playing") +
            "\n\n⏱️ *Session expired. Use `/fun wordle` to continue.*",
          components: [buildGuessButton(gameId, true)],
        },
        "wordle.timeout",
      );
    }
  });
}
