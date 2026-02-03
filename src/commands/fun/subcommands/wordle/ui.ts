// src/commands/fun/subcommands/wordle/ui.ts
//
// Wordle Discord UI: message formatting and button builders.

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { getLetterResult } from "./gameLogic.js";
import { MAX_GUESSES } from "../wordleStore.js";

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

export function buildGameMessage(
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

export function buildGuessButton(
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
