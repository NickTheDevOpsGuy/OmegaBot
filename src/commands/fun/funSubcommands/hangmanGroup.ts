// src/commands/fun/funSubcommands/hangmanGroup.ts

import type { SlashCommandSubcommandGroupBuilder } from "discord.js";

export function buildHangmanGroup(g: SlashCommandSubcommandGroupBuilder) {
  return g
    .setName("hangman")
    .setDescription("Hangman word game: play, stats, or manage words (admin)")
    .addSubcommand((s) =>
      s
        .setName("play")
        .setDescription("Play Hangman - guess the word!")
        .addStringOption((o) =>
          o
            .setName("difficulty")
            .setDescription("Word difficulty")
            .addChoices(
              { name: "Easy", value: "easy" },
              { name: "Medium", value: "medium" },
              { name: "Hard", value: "hard" },
            ),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("stats")
        .setDescription("Show your Hangman stats")
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("words_add")
        .setDescription("(Admin) Add a word to the Hangman list")
        .addStringOption((o) =>
          o
            .setName("word")
            .setDescription("Word to add (letters only)")
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("difficulty")
            .setDescription("Difficulty")
            .setRequired(true)
            .addChoices(
              { name: "Easy", value: "easy" },
              { name: "Medium", value: "medium" },
              { name: "Hard", value: "hard" },
            ),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("words_list")
        .setDescription("(Admin) List Hangman words")
        .addStringOption((o) =>
          o
            .setName("difficulty")
            .setDescription("Filter by difficulty")
            .addChoices(
              { name: "Easy", value: "easy" },
              { name: "Medium", value: "medium" },
              { name: "Hard", value: "hard" },
            ),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    );
}
