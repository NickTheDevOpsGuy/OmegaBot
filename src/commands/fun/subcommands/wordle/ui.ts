// src/commands/fun/subcommands/wordle/ui.ts
//
// Wordle Discord UI: message formatting and button builders.

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { getLetterResult } from "./gameLogic.js";
import { MAX_GUESSES } from "../wordleStore.js";

type LetterStatus = "correct" | "present" | "absent" | "untried";

/** One row of the grid: each cell is square + letter, space-separated (e.g. 🟩H 🟩E 🟨L ⬛L ⬛O). */
function formatGuess(guess: string, word: string): string {
  return guess
    .split("")
    .map((letter, i) => {
      const result = getLetterResult(guess, word, i);
      const square = result === "correct" ? "🟩" : result === "present" ? "🟨" : "⬛";
      return `${square}${letter.toUpperCase()}`;
    })
    .join(" ");
}

/** Build letter status from all guesses (best status wins: correct > present > absent). */
function getLetterStatuses(guesses: string[], word: string): Map<string, LetterStatus> {
  const status = new Map<string, LetterStatus>();
  for (const guess of guesses) {
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const result = getLetterResult(guess, word, i);
      const current = status.get(letter);
      if (!current || result === "correct") status.set(letter, result);
      else if (current !== "correct" && result === "present")
        status.set(letter, "present");
      else if (current === "absent" && result !== "absent") status.set(letter, result);
    }
  }
  return status;
}

/** QWERTY keyboard layout for letter bank. */
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function buildLetterBank(guesses: string[], word: string): string {
  const statuses = getLetterStatuses(guesses, word);
  const rows = KEYBOARD_ROWS.map((row) =>
    row
      .split("")
      .map((letter) => {
        const s = statuses.get(letter.toLowerCase());
        if (s === "correct") return `🟩${letter}`;
        if (s === "present") return `🟨${letter}`;
        if (s === "absent") return `⬛${letter}`;
        return `\`${letter}\``;
      })
      .join(" "),
  );
  return rows.join("\n");
}

export function buildGameMessage(
  guesses: string[],
  word: string,
  status: "playing" | "won" | "lost",
): string {
  const lines = ["🟩 **Wordle** - Daily Puzzle", ""];

  for (const guess of guesses) {
    lines.push(formatGuess(guess, word));
  }

  for (let i = guesses.length; i < MAX_GUESSES; i++) {
    lines.push("⬜ ⬜ ⬜ ⬜ ⬜");
  }

  lines.push("");
  lines.push("**Letters tried:**");
  lines.push(buildLetterBank(guesses, word));
  lines.push("");

  if (status === "won") {
    lines.push(`🎉 **Congratulations!** You got it in ${guesses.length}/${MAX_GUESSES}!`);
    const shareGrid = guesses
      .map((g) =>
        g
          .split("")
          .map((_, i) => {
            const r = getLetterResult(g, word, i);
            return r === "correct" ? "🟩" : r === "present" ? "🟨" : "⬛";
          })
          .join(""),
      )
      .join("\n");
    lines.push("");
    lines.push(`**Share:** Wordle ${guesses.length}/${MAX_GUESSES}\n${shareGrid}`);
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
    new ButtonBuilder()
      .setCustomId(`wordle:${gameId}:extend`)
      .setLabel("Extend time")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏱️")
      .setDisabled(disabled),
  );
}
