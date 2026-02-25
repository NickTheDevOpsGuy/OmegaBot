// src/commands/fun/subcommands/hangman.ts
//
// Classic Hangman word guessing game.
//
// Features:
// - Words stored in SQLite (hangman_words) with difficulty (easy/medium/hard)
// - Letter selection via dropdowns (A–M and N–Z) so Z is always available
// - Stats: wins, losses, total guesses, best solve time, average solve time
// - 1-hour game timeout
// - Admin can add words via /fun hangman words add (role from HANGMAN_ADMIN_ROLE_ID)

import {
  ComponentType,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { HANGMAN_COOLDOWN_MS } from "../../../constants.js";
import { logger } from "../../../utils/logger.js";
import { recordInteractionRecovery } from "../../../services/metrics/server.js";
import {
  checkHangmanCooldown,
  formatCooldownMessage,
  recordHangmanGame,
} from "../../../services/discord/rateLimit.js";
import { safeMessageEdit } from "../../../services/discord/safeReply.js";
import {
  getRandomWord,
  addWord as addWordToStore,
  listWords,
  getWordCount,
  type HangmanDifficulty,
} from "./hangmanWordStore.js";
import {
  MAX_WRONG_GUESSES,
  buildGameMessage,
  buildLetterDropdowns,
} from "./hangman/ui.js";
import { getStats, recordResult } from "./hangman/hangmanStats.js";
import { GAME_TIMEOUT_MS } from "../../../constants.js";

export type { HangmanStats } from "./hangman/hangmanStats.js";
export { getStats, recordResult } from "./hangman/hangmanStats.js";

/* -------------------------------------------------------------------------- */
/* Play                                                                       */
/* -------------------------------------------------------------------------- */

export async function runPlay(
  interaction: ChatInputCommandInteraction,
  difficulty: HangmanDifficulty,
): Promise<void> {
  const remaining = checkHangmanCooldown(interaction.user.id);
  if (remaining > 0) {
    await interaction.editReply(
      formatCooldownMessage(remaining, HANGMAN_COOLDOWN_MS / 1000, "hangman"),
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
    content: buildGameMessage(word, guessed, wrongCount, "playing", difficulty),
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

      // Acknowledge immediately so game logic doesn't cause "interaction failed"
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
        recordResult(userId, isWon, totalGuesses, solveTimeSeconds);
        logger.info(
          { gameId, userId, won: isWon, totalGuesses, solveTimeSeconds },
          "[hangman] game ended",
        );

        await message.edit({
          content: buildGameMessage(
            word,
            guessed,
            wrongCount,
            isWon ? "won" : "lost",
            difficulty,
            solveTimeSeconds,
          ),
          components: buildLetterDropdowns(gameId, guessed, true),
        });
        return;
      }

      await message.edit({
        content: buildGameMessage(word, guessed, wrongCount, "playing", difficulty),
        components: buildLetterDropdowns(gameId, guessed),
      });
    } catch (err) {
      recordInteractionRecovery("hangman");
      logger.warn(
        { err, gameId, interactionFailedRecovery: true },
        "[hangman] collect handler failed",
      );
      if (!selectInteraction.replied && !selectInteraction.deferred) {
        await selectInteraction.deferUpdate().catch(() => {});
      }
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      recordResult(userId, false, totalGuesses);
      logger.warn({ gameId, userId }, "[hangman] timed out");
      await safeMessageEdit(
        message,
        {
          content:
            buildGameMessage(word, guessed, wrongCount, "lost", difficulty) +
            "\n\n⏱️ *Timed out*",
          components: buildLetterDropdowns(gameId, guessed, true),
        },
        "hangman.timeout",
      ).catch(() => {});
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Stats                                                                      */
/* -------------------------------------------------------------------------- */

export async function runStats(interaction: ChatInputCommandInteraction): Promise<void> {
  const stats = getStats(interaction.user.id);
  const total = stats.wins + stats.losses;

  const lines = [
    `🎯 **Hangman Stats for ${interaction.user}**`,
    "",
    `Games: ${total} | Wins: ${stats.wins} | Losses: ${stats.losses}`,
    `Win Rate: ${stats.winRate}%`,
    `Total Guesses: ${stats.totalGuesses}`,
  ];
  if (stats.bestTimeSeconds != null) {
    lines.push(`⏱️ Fastest win: **${stats.bestTimeSeconds}s**`);
  }
  if (stats.averageTimeSeconds != null) {
    lines.push(`⏱️ Average win time: **${stats.averageTimeSeconds}s**`);
  }

  await interaction.editReply(lines.join("\n"));
}

/* -------------------------------------------------------------------------- */
/* Words (admin)                                                              */
/* -------------------------------------------------------------------------- */

function isHangmanAdmin(interaction: ChatInputCommandInteraction): boolean {
  const roleId = process.env.HANGMAN_ADMIN_ROLE_ID?.trim();
  if (!roleId) return false;
  if (!interaction.inGuild() || !interaction.member) return false;
  const member = interaction.member;
  const roles = "roles" in member ? member.roles : null;
  if (!roles) return false;
  if (Array.isArray(roles)) return roles.includes(roleId);
  return roles.cache?.has(roleId) ?? false;
}

export async function runWordsAdd(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!isHangmanAdmin(interaction)) {
    await interaction.editReply(
      "You need the Hangman admin role (configured via `HANGMAN_ADMIN_ROLE_ID` in .env) to add words.",
    );
    return;
  }

  const word = interaction.options.getString("word", true).trim();
  const difficulty = interaction.options.getString(
    "difficulty",
    true,
  ) as HangmanDifficulty;

  if (!/^[a-zA-Z]+$/.test(word)) {
    await interaction.editReply("Word must contain only letters (A–Z).");
    return;
  }

  const added = addWordToStore(word, difficulty, interaction.user.id);
  if (added) {
    await interaction.editReply(
      `✅ Added **${word.toLowerCase()}** as **${difficulty}**. Total words: ${getWordCount()}.`,
    );
  } else {
    await interaction.editReply(
      `That word is already in the list. Use \`/fun hangman words list\` to see existing words.`,
    );
  }
}

export async function runWordsList(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!isHangmanAdmin(interaction)) {
    await interaction.editReply(
      "You need the Hangman admin role to list words. Use `/fun hangman stats` for your stats.",
    );
    return;
  }

  const difficulty = interaction.options.getString(
    "difficulty",
  ) as HangmanDifficulty | null;
  const words = listWords(difficulty ?? undefined);
  const total = getWordCount();

  if (words.length === 0) {
    await interaction.editReply(
      difficulty
        ? `No **${difficulty}** words yet. Add some with \`/fun hangman words add\`.`
        : "No words in the database yet.",
    );
    return;
  }

  const byDiff = new Map<string, string[]>();
  for (const w of words) {
    const list = byDiff.get(w.difficulty) ?? [];
    list.push(w.word);
    byDiff.set(w.difficulty, list);
  }
  const lines = [`🎯 **Hangman words** (${total} total)`, ""];
  for (const diff of ["easy", "medium", "hard"] as const) {
    const arr = byDiff.get(diff);
    if (arr && arr.length > 0) {
      lines.push(
        `**${diff}** (${arr.length}): ${arr.slice(0, 20).join(", ")}${arr.length > 20 ? "…" : ""}`,
      );
    }
  }

  const text = lines.join("\n");
  if (text.length > 1900) {
    await interaction.editReply(
      `🎯 **Hangman words** (${total} total). Too many to list here; filter by difficulty or check the database.`,
    );
  } else {
    await interaction.editReply(text);
  }
}

/* -------------------------------------------------------------------------- */
/* Legacy single run() for backward compatibility                              */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const sub = interaction.options.getSubcommand();
    if (sub === "play") {
      const difficulty = (interaction.options.getString("difficulty") ??
        "medium") as HangmanDifficulty;
      return await runPlay(interaction, difficulty);
    }
    if (sub === "stats") {
      return await runStats(interaction);
    }
    if (sub === "words_add") {
      return await runWordsAdd(interaction);
    }
    if (sub === "words_list") {
      return await runWordsList(interaction);
    }
    await interaction.editReply("Unknown hangman subcommand.");
  } catch (err) {
    logger.error({ err, userId: interaction.user.id }, "[hangman] handler failed");
    await interaction
      .editReply("Something went wrong with hangman. Try again.")
      .catch(() => {});
  }
}
