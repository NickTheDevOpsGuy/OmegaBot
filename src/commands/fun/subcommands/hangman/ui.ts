// src/commands/fun/subcommands/hangman/ui.ts
// Hangman Discord UI: stages, letter dropdowns, game message.

import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import type { HangmanDifficulty } from "../hangmanWordStore.js";

export const MAX_WRONG_GUESSES = 6;

export const HANGMAN_STAGES = [
  "```\n  +---+\n      |\n      |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n      |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n  |   |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n /|   |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n /|\\  |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n /|\\  |\n /    |\n      |\n      |\n=========```",
  "```\n  +---+\n  O   |\n /|\\  |\n / \\  |\n      |\n      |\n=========```",
];

const LETTERS_AM = "ABCDEFGHIJKLM".split("");
const LETTERS_NZ = "NOPQRSTUVWXYZ".split("");

export function formatWord(word: string, guessed: Set<string>): string {
  return word
    .split("")
    .map((c) => (guessed.has(c) ? c.toUpperCase() : "\\_"))
    .join(" ");
}

export function buildLetterDropdowns(
  gameId: string,
  guessed: Set<string>,
  disabled = false,
): ActionRowBuilder<StringSelectMenuBuilder>[] {
  const optionsAM = LETTERS_AM.filter((letter) => !guessed.has(letter.toLowerCase())).map(
    (letter) => ({ label: letter, value: `hm:${gameId}:${letter}` }),
  );
  const optionsNZ = LETTERS_NZ.filter((letter) => !guessed.has(letter.toLowerCase())).map(
    (letter) => ({ label: letter, value: `hm:${gameId}:${letter}` }),
  );

  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`hm:${gameId}:select`)
      .setPlaceholder("Guess letter (A–M)")
      .setMinValues(1)
      .setMaxValues(1)
      .setDisabled(disabled)
      .addOptions(
        optionsAM.length > 0 ? optionsAM : [{ label: "—", value: `hm:${gameId}:noop` }],
      ),
  );
  const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`hm:${gameId}:select2`)
      .setPlaceholder("Guess letter (N–Z)")
      .setMinValues(1)
      .setMaxValues(1)
      .setDisabled(disabled)
      .addOptions(
        optionsNZ.length > 0 ? optionsNZ : [{ label: "—", value: `hm:${gameId}:noop` }],
      ),
  );
  return [row1, row2];
}

export function buildGameMessage(
  word: string,
  guessed: Set<string>,
  wrongCount: number,
  status: "playing" | "won" | "lost",
  difficulty: HangmanDifficulty,
  solveTimeSeconds?: number,
): string {
  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const lines = [
    "🎯 **Hangman**",
    `*Difficulty: ${diffLabel}*`,
    "",
    HANGMAN_STAGES[Math.min(wrongCount, MAX_WRONG_GUESSES)],
    "",
    `Word: ${formatWord(word, guessed)}`,
    "",
  ];

  const wrongLetters = [...guessed]
    .filter((l) => !word.includes(l))
    .join(", ")
    .toUpperCase();
  if (wrongLetters) {
    lines.push(`Wrong: ${wrongLetters} (${wrongCount}/${MAX_WRONG_GUESSES})`);
  }

  if (status === "won") {
    lines.push("", "🎉 **You won!** The word was: **" + word.toUpperCase() + "**");
    if (solveTimeSeconds != null) {
      lines.push(`⏱️ Solved in **${solveTimeSeconds}** seconds!`);
    }
  } else if (status === "lost") {
    lines.push("", "💀 **Game over!** The word was: **" + word.toUpperCase() + "**");
  }

  return lines.join("\n");
}
