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
import { logger } from "../../../../../../utils/logger.js";
import { recordInteractionRecovery } from "../../../../../../services/core/metrics/server.js";
import { SHORT_TIMEOUT_MS } from "../../../../../../utils/constants.js";
import {
  getStats,
  getTodayGame,
  saveGame,
  MAX_GUESSES,
  WORD_LENGTH,
} from "./wordleStore.js";
import { getNewlyUnlockedAchievementLine } from "../../../../achievements/achievements.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import { getTodayWord, isWordInList } from "./gameLogic.js";
import { buildGameMessage, buildGuessButton } from "./ui.js";
import {
  safeMessageEdit,
  notifyGameMessageGone,
} from "../../../../../../services/discord/discord/safeReply.js";

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

  if (!existingGame && interaction.channel && "send" in interaction.channel) {
    interaction.channel
      .send(`👀 ${interaction.user} is playing Wordle!`)
      .catch((err) => logger.debug({ err }, "[wordle] tease send failed"));
  }

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 3_600_000, // 1 hour
    filter: (i) =>
      i.user.id === interaction.user.id && i.customId.startsWith(`wordle:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction) => {
    try {
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

      try {
        await buttonInteraction.showModal(modal);
      } catch (err) {
        logger.warn({ err, gameId }, "[wordle] show guess modal threw");
        await buttonInteraction.deferUpdate().catch(() => {});
        const ok = await safeMessageEdit(
          message,
          {
            content:
              buildGameMessage(guesses, word, "playing") +
              "\n\n⚠️ Couldn't open the guess form. Click the button again.",
            components: [buildGuessButton(gameId)],
          },
          "wordle.showModal",
        ).catch(() => false);
        if (!ok) await notifyGameMessageGone(buttonInteraction, "wordle");
        return;
      }

      try {
        const modalSubmit = await buttonInteraction.awaitModalSubmit({
          time: SHORT_TIMEOUT_MS,
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

        if (!isWordInList(guess)) {
          await modalSubmit.reply({
            content:
              "That word isn't in the word list. Try another 5-letter word — this guess doesn't count.",
            ephemeral: true,
          });
          return;
        }

        // Defer immediately — gives us time to process without hitting Discord's 3s limit
        await modalSubmit.deferUpdate();

        guesses.push(guess);

        const won = guess === word;
        const lost = !won && guesses.length >= MAX_GUESSES;

        if (won || lost) {
          collector.stop(won ? "won" : "lost");
          const achievementLine = getNewlyUnlockedAchievementLine(userId, getDb(), () =>
            saveGame(userId, guesses, won, word),
          );
          logger.info(
            { gameId, userId, won, guesses: guesses.length },
            "[wordle] game ended",
          );

          const statsHint = "*See your stats: `/fun wordle stats`*";
          const content =
            buildGameMessage(guesses, word, won ? "won" : "lost") +
            "\n\n" +
            statsHint +
            (achievementLine ? `\n\n${achievementLine}` : "");

          await interaction.editReply({
            content,
            components: [buildGuessButton(gameId, true)],
          });

          if (won && interaction.channel && "send" in interaction.channel) {
            interaction.channel
              .send(
                `🎉 ${interaction.user} got today's Wordle in ${guesses.length} guess${guesses.length === 1 ? "" : "es"}!`,
              )
              .catch((err) => logger.debug({ err }, "[wordle] win tease send failed"));
          }
          return;
        }

        saveGame(userId, guesses, false, word);

        await interaction.editReply({
          content: buildGameMessage(guesses, word, "playing"),
          components: [buildGuessButton(gameId)],
        });
      } catch (err) {
        logger.debug({ err, gameId }, "[wordle] modal timeout or error");
        // Modal expired or user closed it — update message so they know to try again
        const ok = await safeMessageEdit(
          message,
          {
            content:
              buildGameMessage(guesses, word, "playing") +
              "\n\n⏱️ *Guess timed out or cancelled. Click the button to guess again.*",
            components: [buildGuessButton(gameId)],
          },
          "wordle.modalTimeout",
        ).catch(() => false);
        if (!ok) await notifyGameMessageGone(buttonInteraction, "wordle");
      }
    } catch (err) {
      recordInteractionRecovery("wordle");
      logger.warn(
        { err, gameId, interactionFailedRecovery: true },
        "[wordle] game button collect threw",
      );
      if (!buttonInteraction.replied && !buttonInteraction.deferred) {
        await buttonInteraction.deferUpdate().catch(() => {});
      }
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
      ).catch(() => {});
    }
  });
}
