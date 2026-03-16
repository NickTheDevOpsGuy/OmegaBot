// src/commands/fun/subcommands/hangman/play.ts
import {
  ComponentType,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { HANGMAN_COOLDOWN_MS } from "../../../../../../utils/constants.js";
import { GAME_TIMEOUT_MS } from "../../../../../../utils/constants.js";
import { getContextLogger } from "../../../../../../services/core/logging/requestContext.js";
import { logger } from "../../../../../../utils/logger.js";
import { recordInteractionRecovery } from "../../../../../../services/core/metrics/server.js";
import {
  checkHangmanCooldown,
  formatCooldownMessage,
  recordHangmanGame,
} from "../../../../../../services/discord/discord/rateLimit/index.js";
import {
  safeMessageEdit,
  notifyGameMessageGone,
} from "../../../../../../services/discord/discord/safeReply.js";
import { getRandomWord, type HangmanDifficulty } from "./hangmanWordStore.js";
import { MAX_WRONG_GUESSES, buildHangmanEmbed, buildLetterDropdowns } from "./ui.js";
import { getNewlyUnlockedAchievementLine } from "../../../../achievements/achievements.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import { recordResult } from "./hangmanStats.js";

export async function runPlay(
  interaction: ChatInputCommandInteraction,
  difficulty: HangmanDifficulty,
): Promise<void> {
  const remaining = checkHangmanCooldown(interaction.user.id);
  if (remaining > 0) {
    await interaction.editReply(
      formatCooldownMessage(
        remaining,
        HANGMAN_COOLDOWN_MS / 1000,
        "hangman",
        interaction.guild?.preferredLocale ?? null,
      ),
    );
    return;
  }

  const word = getRandomWord(difficulty);
  if (!word) {
    await interaction.editReply(
      "No words available for that difficulty. An admin can add words with `/fun hangman words add`.",
    );
    return;
  }

  const gameId = `${Date.now()}-${interaction.user.id}`;
  const userId = interaction.user.id;
  const guessed = new Set<string>();
  let wrongCount = 0;
  let totalGuesses = 0;
  const startTime = Date.now();

  recordHangmanGame(userId);
  logger.info({ gameId, userId, difficulty }, "[hangman] game started");

  const message = await interaction.editReply({
    embeds: [buildHangmanEmbed(word, guessed, wrongCount, "playing", difficulty)],
    components: buildLetterDropdowns(gameId, guessed),
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: GAME_TIMEOUT_MS,
    filter: (i) =>
      i.user.id === interaction.user.id &&
      (i.customId === `hm:${gameId}:select` || i.customId === `hm:${gameId}:select2`),
  });

  collector.on("collect", async (selectInteraction: StringSelectMenuInteraction) => {
    try {
      const value = selectInteraction.values[0];
      if (!value || value.endsWith(":noop")) {
        await selectInteraction.deferUpdate();
        return;
      }
      const letter = value.split(":")[2]?.toLowerCase();
      if (!letter || letter.length !== 1) {
        await selectInteraction.deferUpdate();
        return;
      }

      if (guessed.has(letter)) {
        await selectInteraction.deferUpdate();
        return;
      }

      await selectInteraction.deferUpdate();

      guessed.add(letter);
      totalGuesses++;

      if (!word.includes(letter)) {
        wrongCount++;
      }

      const isWon = word.split("").every((c) => guessed.has(c));
      const isLost = wrongCount >= MAX_WRONG_GUESSES;

      if (isWon || isLost) {
        collector.stop(isWon ? "won" : "lost");
        const solveTimeSeconds = isWon
          ? Math.round((Date.now() - startTime) / 1000)
          : undefined;
        let extraLine = "*See your stats: `/fun hangman stats`*";
        if (isWon) {
          const achievementLine = getNewlyUnlockedAchievementLine(userId, getDb(), () =>
            recordResult(userId, true, totalGuesses, solveTimeSeconds),
          );
          if (achievementLine) extraLine += `\n\n${achievementLine}`;
        } else {
          recordResult(userId, false, totalGuesses, solveTimeSeconds);
        }
        logger.info(
          { gameId, userId, won: isWon, totalGuesses, solveTimeSeconds },
          "[hangman] game ended",
        );

        const okEnd = await safeMessageEdit(
          message,
          {
            embeds: [
              buildHangmanEmbed(
                word,
                guessed,
                wrongCount,
                isWon ? "won" : "lost",
                difficulty,
                solveTimeSeconds,
                extraLine,
              ),
            ],
            components: buildLetterDropdowns(gameId, guessed, true),
          },
          "hangman.gameEnd",
          interaction,
        ).catch(() => false);
        if (!okEnd) await notifyGameMessageGone(selectInteraction, "hangman");
        return;
      }

      const okPlaying = await safeMessageEdit(
        message,
        {
          embeds: [buildHangmanEmbed(word, guessed, wrongCount, "playing", difficulty)],
          components: buildLetterDropdowns(gameId, guessed),
        },
        "hangman.playing",
        interaction,
      ).catch(() => false);
      if (!okPlaying) {
        collector.stop("message_gone");
        await notifyGameMessageGone(selectInteraction, "hangman");
      }
    } catch (err) {
      recordInteractionRecovery("hangman");
      getContextLogger().warn(
        { err, gameId, interactionFailedRecovery: true },
        "[hangman] letter button collect threw",
      );
      if (!selectInteraction.replied && !selectInteraction.deferred) {
        await selectInteraction.deferUpdate().catch(() => {});
      }
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      recordResult(userId, false, totalGuesses);
      getContextLogger().warn({ gameId, userId }, "[hangman] timed out");
      await safeMessageEdit(
        message,
        {
          embeds: [
            buildHangmanEmbed(
              word,
              guessed,
              wrongCount,
              "lost",
              difficulty,
              undefined,
              "⏱️ *Timed out*",
            ),
          ],
          components: buildLetterDropdowns(gameId, guessed, true),
        },
        "hangman.timeout",
        interaction,
      ).catch(() => {});
    }
  });
}
