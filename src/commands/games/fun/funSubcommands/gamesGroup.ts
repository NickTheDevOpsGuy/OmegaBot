// src/commands/fun/funSubcommands/gamesGroup.ts
// Game subcommands for /fun

import type { SlashCommandSubcommandsOnlyBuilder } from "discord.js";

export function addGamesSubcommands(
  builder: SlashCommandSubcommandsOnlyBuilder,
): SlashCommandSubcommandsOnlyBuilder {
  return builder
    .addSubcommand((s) =>
      s
        .setName("8ball")
        .setDescription("Ask the magic 8-ball a question")
        .addStringOption((o) =>
          o
            .setName("question")
            .setDescription("Your yes/no question")
            .setRequired(true)
            .setMaxLength(200),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("rps")
        .setDescription("Play rock paper scissors")
        .addStringOption((o) =>
          o
            .setName("choice")
            .setDescription("Your choice (for solo play vs bot)")
            .addChoices(
              { name: "Rock 🪨", value: "rock" },
              { name: "Paper 📄", value: "paper" },
              { name: "Scissors ✂️", value: "scissors" },
            ),
        )
        .addUserOption((o) =>
          o.setName("opponent").setDescription("Challenge another player"),
        )
        .addBooleanOption((o) => o.setName("stats").setDescription("Show your RPS stats"))
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("trivia")
        .setDescription("Answer trivia questions for points")
        .addStringOption((o) =>
          o
            .setName("category")
            .setDescription("Question category")
            .addChoices(
              { name: "🎯 General", value: "general" },
              { name: "🔬 Science", value: "science" },
              { name: "📜 History", value: "history" },
              { name: "🌍 Geography", value: "geography" },
              { name: "🎬 Entertainment", value: "entertainment" },
              { name: "⚽ Sports", value: "sports" },
            ),
        )
        .addBooleanOption((o) =>
          o.setName("stats").setDescription("Show your trivia stats"),
        )
        .addBooleanOption((o) =>
          o.setName("leaderboard").setDescription("Show trivia leaderboard"),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("daily")
        .setDescription("Daily check-in for points and streaks")
        .addBooleanOption((o) =>
          o.setName("stats").setDescription("Show your daily stats"),
        )
        .addBooleanOption((o) =>
          o.setName("leaderboard").setDescription("Show daily leaderboard"),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("tictactoe")
        .setDescription("Play Tic Tac Toe")
        .addUserOption((o) =>
          o
            .setName("opponent")
            .setDescription("Challenge another player (or play vs bot)"),
        )
        .addBooleanOption((o) =>
          o.setName("stats").setDescription("Show your Tic Tac Toe stats"),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("blackjack")
        .setDescription("Play a quick game of Blackjack (vs dealer)")
        .addBooleanOption((o) =>
          o.setName("stats").setDescription("Show your blackjack stats"),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("connect4")
        .setDescription("Play Connect 4 vs another user")
        .addUserOption((o) =>
          o.setName("user").setDescription("Opponent").setRequired(false),
        )
        .addBooleanOption((o) =>
          o.setName("stats").setDescription("Show your Connect 4 stats"),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("would-you-rather")
        .setDescription("Would you rather… vote with buttons")
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("fact")
        .setDescription("Random interesting fact")
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("wordle")
        .setDescription("Play the daily Wordle puzzle")
        .addBooleanOption((o) =>
          o.setName("stats").setDescription("Show your Wordle stats"),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("darts")
        .setDescription("Throw 3 darts at the board!")
        .addUserOption((o) =>
          o.setName("opponent").setDescription("Challenge another player to darts"),
        )
        .addBooleanOption((o) =>
          o.setName("stats").setDescription("Show your darts stats"),
        )
        .addStringOption((o) =>
          o
            .setName("leaderboard")
            .setDescription("Show leaderboard")
            .addChoices(
              { name: "Best round", value: "best" },
              { name: "Most 180s", value: "180" },
              { name: "PvP wins", value: "pvp" },
            ),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("slots")
        .setDescription("Spin the slot machine!")
        .addBooleanOption((o) =>
          o.setName("stats").setDescription("Show your slots stats"),
        )
        .addBooleanOption((o) =>
          o.setName("leaderboard").setDescription("Show jackpot leaderboard"),
        )
        .addBooleanOption((o) =>
          o.setName("paytable").setDescription("Show payout table"),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("stats")
        .setDescription("View all your fun command stats in one place")
        .addUserOption((o) => o.setName("user").setDescription("User to view stats for"))
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("choose")
        .setDescription("Pick one or more options at random (e.g. pizza, pasta, salad)")
        .addStringOption((o) =>
          o
            .setName("items")
            .setDescription("Options separated by commas or slashes")
            .setRequired(true)
            .setMaxLength(500),
        )
        .addIntegerOption((o) =>
          o
            .setName("count")
            .setDescription("How many to pick (default 1)")
            .setMinValue(1)
            .setMaxValue(20),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("dice")
        .setDescription("Roll dice (e.g. 2d6+3 or use sides/count)")
        .addStringOption((o) =>
          o
            .setName("notation")
            .setDescription("Dice notation: XdY+Z (e.g. 2d6+3, 1d20)")
            .setMaxLength(20),
        )
        .addIntegerOption((o) =>
          o
            .setName("sides")
            .setDescription("Sides per die (if not using notation)")
            .setMinValue(2)
            .setMaxValue(100),
        )
        .addIntegerOption((o) =>
          o
            .setName("count")
            .setDescription("Number of dice (if not using notation)")
            .setMinValue(1)
            .setMaxValue(10),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("coinflip")
        .setDescription("Flip a coin")
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )
    .addSubcommand((s) =>
      s
        .setName("coinflipstats")
        .setDescription("View coin flip stats or leaderboard")
        .addBooleanOption((o) =>
          o.setName("leaderboard").setDescription("Show leaderboard"),
        )
        .addUserOption((o) => o.setName("user").setDescription("User to inspect"))
        .addIntegerOption((o) =>
          o
            .setName("limit")
            .setDescription("Rows to show")
            .setMinValue(1)
            .setMaxValue(25),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    );
}
