// src/commands/fun/subcommands/hangman.ts
//
// Classic Hangman word guessing game.
// Play flow in hangman/play.ts, stats in hangman/statsDisplay.ts, admin words in hangman/words.ts.

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import type { HangmanDifficulty } from "./hangmanWordStore.js";
import { runPlay } from "./hangman/play.js";
import { runStats } from "./hangman/statsDisplay.js";
import { runWordsAdd, runWordsList } from "./hangman/words.js";

export type { HangmanStats } from "./hangman/hangmanStats.js";
export { getStats, recordResult } from "./hangman/hangmanStats.js";
export { runPlay } from "./hangman/play.js";
export { runStats } from "./hangman/statsDisplay.js";
export { runWordsAdd, runWordsList } from "./hangman/words.js";

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
