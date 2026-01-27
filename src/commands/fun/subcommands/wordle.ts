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
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";

// Word list - common 5-letter words
const WORDS = [
  "about",
  "above",
  "abuse",
  "actor",
  "acute",
  "admit",
  "adopt",
  "adult",
  "after",
  "again",
  "agent",
  "agree",
  "ahead",
  "alarm",
  "album",
  "alert",
  "alike",
  "alive",
  "allow",
  "alone",
  "along",
  "alter",
  "among",
  "anger",
  "angle",
  "angry",
  "apart",
  "apple",
  "apply",
  "arena",
  "argue",
  "arise",
  "array",
  "aside",
  "asset",
  "avoid",
  "award",
  "aware",
  "badly",
  "baker",
  "bases",
  "basic",
  "basin",
  "basis",
  "beach",
  "began",
  "begin",
  "begun",
  "being",
  "below",
  "bench",
  "billy",
  "birth",
  "black",
  "blame",
  "blank",
  "blast",
  "blend",
  "bless",
  "blind",
  "block",
  "blood",
  "bloom",
  "blown",
  "blues",
  "board",
  "boost",
  "booth",
  "bound",
  "brain",
  "brand",
  "bread",
  "break",
  "breed",
  "brick",
  "bride",
  "brief",
  "bring",
  "broad",
  "broke",
  "brown",
  "brush",
  "build",
  "built",
  "bunch",
  "burst",
  "buyer",
  "cabin",
  "cable",
  "calif",
  "carry",
  "catch",
  "cause",
  "chain",
  "chair",
  "chaos",
  "charm",
  "chart",
  "chase",
  "cheap",
  "check",
  "chest",
  "chief",
  "child",
  "china",
  "chose",
  "civil",
  "claim",
  "class",
  "clean",
  "clear",
  "click",
  "climb",
  "clock",
  "close",
  "cloud",
  "coach",
  "coast",
  "could",
  "count",
  "court",
  "cover",
  "crack",
  "craft",
  "crash",
  "crazy",
  "cream",
  "crime",
  "cross",
  "crowd",
  "crown",
  "cycle",
  "daily",
  "dance",
  "dated",
  "dealt",
  "death",
  "debut",
  "decay",
  "depth",
  "doing",
  "doubt",
  "dozen",
  "draft",
  "drain",
  "drama",
  "drank",
  "drawn",
  "dream",
  "dress",
  "drink",
  "drive",
  "drops",
  "drove",
  "drugs",
  "dying",
  "early",
  "earth",
  "eight",
  "elite",
  "empty",
  "enemy",
  "enjoy",
  "enter",
  "entry",
  "equal",
  "error",
  "essay",
  "event",
  "every",
  "exact",
  "exist",
  "extra",
  "faith",
  "falls",
  "false",
  "fancy",
  "fatal",
  "fault",
  "favor",
  "feast",
  "fiber",
  "field",
  "fifth",
  "fifty",
  "fight",
  "final",
  "first",
  "fixed",
  "flash",
  "fleet",
  "flesh",
  "float",
  "floor",
  "fluid",
  "focus",
  "force",
  "forge",
  "forth",
  "forty",
  "forum",
  "found",
  "frame",
  "frank",
  "fraud",
  "fresh",
  "front",
  "fruit",
  "fully",
  "funny",
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

function ensureWordleTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS wordle_games (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      word TEXT NOT NULL,
      guesses TEXT NOT NULL,
      won INTEGER NOT NULL,
      completed_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS wordle_stats (
      user_id TEXT PRIMARY KEY,
      played INTEGER NOT NULL DEFAULT 0,
      won INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      max_streak INTEGER NOT NULL DEFAULT 0,
      guess_distribution TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL
    );
  `);
}

type WordleStats = {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  winRate: number;
  guessDistribution: Record<string, number>;
};

function getStats(userId: string): WordleStats {
  ensureWordleTables();
  const db = getDb();

  type Row = {
    played: number;
    won: number;
    current_streak: number;
    max_streak: number;
    guess_distribution: string;
  };

  const row = db
    .prepare(
      `SELECT played, won, current_streak, max_streak, guess_distribution FROM wordle_stats WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  if (!row) {
    return {
      played: 0,
      won: 0,
      currentStreak: 0,
      maxStreak: 0,
      winRate: 0,
      guessDistribution: {},
    };
  }

  return {
    played: row.played,
    won: row.won,
    currentStreak: row.current_streak,
    maxStreak: row.max_streak,
    winRate: row.played > 0 ? Math.round((row.won / row.played) * 100) : 0,
    guessDistribution: JSON.parse(row.guess_distribution || "{}"),
  };
}

function getTodayWord(): string {
  const today = new Date().toISOString().split("T")[0];
  const seed = today.split("-").join("");
  const index = parseInt(seed, 10) % WORDS.length;
  return WORDS[index];
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getTodayGame(userId: string): { guesses: string[]; won: boolean } | null {
  ensureWordleTables();
  const db = getDb();
  const today = getTodayDate();

  type Row = { guesses: string; won: number };
  const row = db
    .prepare(`SELECT guesses, won FROM wordle_games WHERE user_id = ? AND date = ?`)
    .get(userId, today) as Row | undefined;

  if (!row) return null;

  return {
    guesses: JSON.parse(row.guesses),
    won: row.won === 1,
  };
}

function saveGame(userId: string, guesses: string[], won: boolean): void {
  ensureWordleTables();
  const db = getDb();
  const now = Date.now();
  const today = getTodayDate();
  const word = getTodayWord();

  db.prepare(
    `INSERT OR REPLACE INTO wordle_games (user_id, date, word, guesses, won, completed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(userId, today, word, JSON.stringify(guesses), won ? 1 : 0, now);

  // Update stats
  const stats = getStats(userId);
  const newStreak = won ? stats.currentStreak + 1 : 0;
  const newMaxStreak = Math.max(stats.maxStreak, newStreak);

  const dist = stats.guessDistribution;
  if (won) {
    const key = String(guesses.length);
    dist[key] = (dist[key] || 0) + 1;
  }

  db.prepare(
    `INSERT INTO wordle_stats (user_id, played, won, current_streak, max_streak, guess_distribution, updated_at)
     VALUES (?, 1, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       played = played + 1,
       won = won + ?,
       current_streak = ?,
       max_streak = ?,
       guess_distribution = ?,
       updated_at = ?`,
  ).run(
    userId,
    won ? 1 : 0,
    newStreak,
    newMaxStreak,
    JSON.stringify(dist),
    now,
    won ? 1 : 0,
    newStreak,
    newMaxStreak,
    JSON.stringify(dist),
    now,
  );
}

/* -------------------------------------------------------------------------- */
/* UI                                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Determine the result for a letter in a guess.
 * - "correct": Letter is in the right position (🟩)
 * - "present": Letter is in the word but wrong position (🟨)
 * - "absent": Letter is not in the word (⬛)
 *
 * Note: This simple implementation doesn't handle duplicate letters
 * perfectly (e.g., guessing "HELLO" for "WORLD" would show both L's
 * as present even though there's only one L). This matches many
 * casual Wordle implementations.
 */
function getLetterResult(
  guess: string,
  word: string,
  index: number,
): "correct" | "present" | "absent" {
  const letter = guess[index];
  if (word[index] === letter) return "correct";
  if (word.includes(letter)) return "present";
  return "absent";
}

function formatGuess(guess: string, word: string): string {
  return guess
    .split("")
    .map((_, i) => {
      const result = getLetterResult(guess, word, i);
      if (result === "correct") return "🟩";
      if (result === "present") return "🟨";
      return "⬛";
    })
    .join("");
}

function buildGameMessage(
  guesses: string[],
  word: string,
  status: "playing" | "won" | "lost",
): string {
  const lines = ["🟩 **Wordle** - Daily Puzzle", ""];

  for (const guess of guesses) {
    lines.push(`${formatGuess(guess, word)} ${guess.toUpperCase()}`);
  }

  for (let i = guesses.length; i < MAX_GUESSES; i++) {
    lines.push("⬜⬜⬜⬜⬜");
  }

  lines.push("");

  if (status === "won") {
    lines.push(`🎉 **Congratulations!** You got it in ${guesses.length}/${MAX_GUESSES}!`);
  } else if (status === "lost") {
    lines.push(`😢 **Game Over!** The word was **${word.toUpperCase()}**`);
  } else {
    lines.push(`Guess ${guesses.length + 1}/${MAX_GUESSES} - Click the button to guess!`);
  }

  return lines.join("\n");
}

function buildGuessButton(
  gameId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`wordle:${gameId}:guess`)
      .setLabel("Make a Guess")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📝")
      .setDisabled(disabled),
  );
}

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
  const guesses: string[] = existingGame?.guesses ?? [];

  const message = await interaction.editReply({
    content: buildGameMessage(guesses, word, "playing"),
    components: [buildGuessButton(gameId)],
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 600_000, // 10 minutes
    filter: (i) =>
      i.user.id === interaction.user.id && i.customId.startsWith(`wordle:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction) => {
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
        saveGame(interaction.user.id, guesses, won);

        await modalSubmit.deferUpdate();
        await interaction.editReply({
          content: buildGameMessage(guesses, word, won ? "won" : "lost"),
          components: [buildGuessButton(gameId, true)],
        });
        return;
      }

      // Save progress
      saveGame(interaction.user.id, guesses, false);

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
      try {
        await message.edit({
          content:
            buildGameMessage(guesses, word, "playing") +
            "\n\n⏱️ *Session expired. Use `/fun wordle` to continue.*",
          components: [buildGuessButton(gameId, true)],
        });
      } catch (err) {
        logger.debug({ err }, "[wordle] failed to update on timeout");
      }
    }
  });
}
