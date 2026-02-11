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
import { logger } from "../../../utils/logger.js";
import {
  checkHangmanCooldown,
  recordHangmanGame,
} from "../../../services/discord/rateLimit.js";
import { safeMessageEdit } from "../../../services/discord/safeReply.js";
import { getDb } from "../../../services/database/db.js";
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

const GAME_TIMEOUT_MS = 3_600_000; // 1 hour

/* -------------------------------------------------------------------------- */
/* Database (stats)                                                           */
/* -------------------------------------------------------------------------- */

function ensureHangmanTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hangman_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      total_guesses INTEGER NOT NULL DEFAULT 0,
      best_time_seconds INTEGER,
      total_win_time_seconds INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

export type HangmanStats = {
  wins: number;
  losses: number;
  totalGuesses: number;
  winRate: number;
  bestTimeSeconds: number | null;
  averageTimeSeconds: number | null;
};

export function getStats(userId: string): HangmanStats {
  ensureHangmanTable();
  const db = getDb();

  type Row = {
    wins: number;
    losses: number;
    total_guesses: number;
    best_time_seconds: number | null;
    total_win_time_seconds: number;
  };
  const row = db
    .prepare(
      `SELECT wins, losses, total_guesses, best_time_seconds, total_win_time_seconds FROM hangman_stats WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  if (!row)
    return {
      wins: 0,
      losses: 0,
      totalGuesses: 0,
      winRate: 0,
      bestTimeSeconds: null,
      averageTimeSeconds: null,
    };

  const total = row.wins + row.losses;
  const avg =
    row.wins > 0 && row.total_win_time_seconds > 0
      ? Math.round(row.total_win_time_seconds / row.wins)
      : null;
  return {
    wins: row.wins,
    losses: row.losses,
    totalGuesses: row.total_guesses,
    winRate: total > 0 ? Math.round((row.wins / total) * 100) : 0,
    bestTimeSeconds: row.best_time_seconds ?? null,
    averageTimeSeconds: avg,
  };
}

export function recordResult(
  userId: string,
  won: boolean,
  guesses: number,
  solveTimeSeconds?: number,
): void {
  ensureHangmanTable();
  const db = getDb();
  const now = Date.now();

  if (won && solveTimeSeconds != null && solveTimeSeconds >= 0) {
    db.prepare(
      `INSERT INTO hangman_stats (user_id, wins, losses, total_guesses, best_time_seconds, total_win_time_seconds, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         wins = wins + 1,
         total_guesses = total_guesses + ?,
         best_time_seconds = MIN(COALESCE(best_time_seconds, 999999), ?),
         total_win_time_seconds = total_win_time_seconds + ?,
         updated_at = ?`,
    ).run(
      userId,
      1,
      0,
      guesses,
      solveTimeSeconds,
      solveTimeSeconds,
      now,
      guesses,
      solveTimeSeconds,
      solveTimeSeconds,
      now,
    );
  } else {
    db.prepare(
      `INSERT INTO hangman_stats (user_id, wins, losses, total_guesses, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         wins = wins + ?,
         losses = losses + ?,
         total_guesses = total_guesses + ?,
         updated_at = ?`,
    ).run(
      userId,
      won ? 1 : 0,
      won ? 0 : 1,
      guesses,
      now,
      won ? 1 : 0,
      won ? 0 : 1,
      guesses,
      now,
    );
  }
}

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
      `⏱️ Slow down! Try again in **${Math.ceil(remaining / 1000)}** seconds (rate limit: 10s).`,
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

      await selectInteraction.update({
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

    await selectInteraction.update({
      content: buildGameMessage(word, guessed, wrongCount, "playing", difficulty),
      components: buildLetterDropdowns(gameId, guessed),
    });
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
      );
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
