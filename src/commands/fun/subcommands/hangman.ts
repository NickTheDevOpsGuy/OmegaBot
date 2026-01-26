// src/commands/fun/subcommands/hangman.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";

const WORDS = [
  "apple",
  "beach",
  "chair",
  "dance",
  "eagle",
  "flame",
  "grape",
  "house",
  "juice",
  "knife",
  "lemon",
  "mouse",
  "night",
  "ocean",
  "piano",
  "queen",
  "river",
  "snake",
  "tiger",
  "uncle",
  "viola",
  "water",
  "xenon",
  "yacht",
  "zebra",
  "brain",
  "cloud",
  "dream",
  "earth",
  "frost",
  "ghost",
  "happy",
  "image",
  "jolly",
  "karma",
  "lunar",
  "magic",
  "ninja",
  "opera",
  "pixel",
  "quest",
  "robot",
  "storm",
  "train",
  "urban",
  "video",
  "witch",
  "youth",
];

const HANGMAN_STAGES = [
  "```\n  +---+\n      |\n      |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n      |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n  |   |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n /|   |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n /|\\  |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n /|\\  |\n /    |\n      |\n=========```",
  "```\n  +---+\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```",
];

const MAX_WRONG = 6;
const GAME_TIMEOUT_MS = 300_000; // 5 minutes

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

function ensureHangmanTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hangman_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      total_guesses INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

type HangmanStats = {
  wins: number;
  losses: number;
  totalGuesses: number;
  winRate: number;
};

function getStats(userId: string): HangmanStats {
  ensureHangmanTable();
  const db = getDb();

  type Row = { wins: number; losses: number; total_guesses: number };
  const row = db
    .prepare(`SELECT wins, losses, total_guesses FROM hangman_stats WHERE user_id = ?`)
    .get(userId) as Row | undefined;

  if (!row) return { wins: 0, losses: 0, totalGuesses: 0, winRate: 0 };

  const total = row.wins + row.losses;
  return {
    wins: row.wins,
    losses: row.losses,
    totalGuesses: row.total_guesses,
    winRate: total > 0 ? Math.round((row.wins / total) * 100) : 0,
  };
}

function recordResult(userId: string, won: boolean, guesses: number): void {
  ensureHangmanTable();
  const db = getDb();
  const now = Date.now();

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

/* -------------------------------------------------------------------------- */
/* UI                                                                          */
/* -------------------------------------------------------------------------- */

function formatWord(word: string, guessed: Set<string>): string {
  return word
    .split("")
    .map((c) => (guessed.has(c) ? c.toUpperCase() : "\\_"))
    .join(" ");
}

function buildLetterButtons(
  gameId: string,
  guessed: Set<string>,
  disabled = false,
): ActionRowBuilder<ButtonBuilder>[] {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let i = 0; i < 26; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let j = i; j < Math.min(i + 5, 26); j++) {
      const letter = alphabet[j];
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`hm:${gameId}:${letter}`)
          .setLabel(letter)
          .setStyle(
            guessed.has(letter.toLowerCase())
              ? ButtonStyle.Secondary
              : ButtonStyle.Primary,
          )
          .setDisabled(disabled || guessed.has(letter.toLowerCase())),
      );
    }
    rows.push(row);
  }

  // Last row has only 1 letter (Z), but we already handled it
  return rows.slice(0, 5); // Max 5 rows allowed
}

function buildGameMessage(
  word: string,
  guessed: Set<string>,
  wrongCount: number,
  status: "playing" | "won" | "lost",
): string {
  const lines = [
    "🎯 **Hangman**",
    "",
    HANGMAN_STAGES[Math.min(wrongCount, 6)],
    "",
    `Word: ${formatWord(word, guessed)}`,
    "",
  ];

  const wrongLetters = [...guessed]
    .filter((l) => !word.includes(l))
    .join(", ")
    .toUpperCase();
  if (wrongLetters) {
    lines.push(`Wrong: ${wrongLetters} (${wrongCount}/${MAX_WRONG})`);
  }

  if (status === "won") {
    lines.push("", "🎉 **You won!** The word was: **" + word.toUpperCase() + "**");
  } else if (status === "lost") {
    lines.push("", "💀 **Game over!** The word was: **" + word.toUpperCase() + "**");
  }

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Command Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;

  if (showStatsFlag) {
    const stats = getStats(interaction.user.id);
    const total = stats.wins + stats.losses;

    await interaction.editReply(
      [
        `🎯 **Hangman Stats for ${interaction.user}**`,
        "",
        `Games: ${total} | Wins: ${stats.wins} | Losses: ${stats.losses}`,
        `Win Rate: ${stats.winRate}%`,
        `Total Guesses: ${stats.totalGuesses}`,
      ].join("\n"),
    );
    return;
  }

  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const gameId = `${Date.now()}-${interaction.user.id}`;
  const guessed = new Set<string>();
  let wrongCount = 0;
  let totalGuesses = 0;

  const message = await interaction.editReply({
    content: buildGameMessage(word, guessed, wrongCount, "playing"),
    components: buildLetterButtons(gameId, guessed),
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: GAME_TIMEOUT_MS,
    filter: (i) =>
      i.user.id === interaction.user.id && i.customId.startsWith(`hm:${gameId}:`),
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    const letter = buttonInteraction.customId.split(":")[2].toLowerCase();

    if (guessed.has(letter)) {
      await buttonInteraction.deferUpdate();
      return;
    }

    guessed.add(letter);
    totalGuesses++;

    if (!word.includes(letter)) {
      wrongCount++;
    }

    // Check win/lose
    const isWon = word.split("").every((c) => guessed.has(c));
    const isLost = wrongCount >= MAX_WRONG;

    if (isWon || isLost) {
      collector.stop(isWon ? "won" : "lost");
      recordResult(interaction.user.id, isWon, totalGuesses);

      await buttonInteraction.update({
        content: buildGameMessage(word, guessed, wrongCount, isWon ? "won" : "lost"),
        components: buildLetterButtons(gameId, guessed, true),
      });
      return;
    }

    await buttonInteraction.update({
      content: buildGameMessage(word, guessed, wrongCount, "playing"),
      components: buildLetterButtons(gameId, guessed),
    });
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      recordResult(interaction.user.id, false, totalGuesses);
      try {
        await message.edit({
          content:
            buildGameMessage(word, guessed, wrongCount, "lost") + "\n\n⏱️ *Timed out*",
          components: buildLetterButtons(gameId, guessed, true),
        });
      } catch (err) {
        logger.debug({ err }, "[hangman] failed to update on timeout");
      }
    }
  });
}
