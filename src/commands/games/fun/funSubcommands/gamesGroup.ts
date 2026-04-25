// src/commands/fun/funSubcommands/gamesGroup.ts
// Game subcommands for /fun

import type { SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import {
  addLimitOption,
  addPrivateOption,
  addUserOption,
} from "../../../../services/discord/discord/slashOptions.js";

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
        .addBooleanOption(addPrivateOption),
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
        .addStringOption((o) =>
          o
            .setName("view")
            .setDescription("Play or inspect stats")
            .addChoices(
              { name: "Play", value: "play" },
              { name: "Stats", value: "stats" },
            ),
        )
        .addBooleanOption(addPrivateOption),
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
        .addStringOption((o) =>
          o
            .setName("view")
            .setDescription("Play, view stats, or open the leaderboard")
            .addChoices(
              { name: "Play", value: "play" },
              { name: "Stats", value: "stats" },
              { name: "Leaderboard", value: "leaderboard" },
            ),
        )
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("daily")
        .setDescription("Daily check-in for points and streaks")
        .addStringOption((o) =>
          o
            .setName("view")
            .setDescription("Check in, view stats, or open the leaderboard")
            .addChoices(
              { name: "Check in", value: "checkin" },
              { name: "Stats", value: "stats" },
              { name: "Leaderboard", value: "leaderboard" },
            ),
        )
        .addBooleanOption(addPrivateOption),
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
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("blackjack")
        .setDescription("Play a quick game of Blackjack (vs dealer)")
        .addBooleanOption((o) =>
          o.setName("stats").setDescription("Show your blackjack stats"),
        )
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("connect4")
        .setDescription("Play Connect 4 vs another user (persistent, multi-day games)")
        .addUserOption((o) =>
          addUserOption(o, { description: "Opponent for a new game" }),
        )
        .addStringOption((o) =>
          o
            .setName("view")
            .setDescription("Start a game, continue a game, or view stats")
            .addChoices(
              { name: "Play", value: "play" },
              { name: "Continue", value: "continue" },
              { name: "Stats", value: "stats" },
            ),
        )
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("chess")
        .setDescription("Challenge someone to chess or get links to play on Lichess")
        .addUserOption((o) =>
          o.setName("opponent").setDescription("Challenge this user to a game"),
        )
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("would-you-rather")
        .setDescription("Would you rather… vote with buttons")
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("fact")
        .setDescription("Random interesting fact")
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("wordle")
        .setDescription("Play the daily Wordle puzzle")
        .addBooleanOption((o) =>
          o.setName("stats").setDescription("Show your Wordle stats"),
        )
        .addBooleanOption(addPrivateOption),
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
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("slots")
        .setDescription("Spin the slot machine!")
        .addIntegerOption((o) =>
          o
            .setName("rows")
            .setDescription("Paylines: 1 (classic), 3, or 5")
            .addChoices(
              { name: "1 row (classic)", value: 1 },
              { name: "3 rows", value: 3 },
              { name: "5 rows", value: 5 },
            ),
        )
        .addStringOption((o) =>
          o
            .setName("view")
            .setDescription("Spin, view stats, leaderboard, or paytable")
            .addChoices(
              { name: "Spin", value: "spin" },
              { name: "Stats", value: "stats" },
              { name: "Leaderboard", value: "leaderboard" },
              { name: "Paytable", value: "paytable" },
            ),
        )
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("memory")
        .setDescription("Match pairs of cards (memory game)")
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("higherlower")
        .setDescription("Think of a number 1–100; bot guesses with Higher/Lower")
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("quest")
        .setDescription("View today's rotating quests and auto-claim rewards")
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("stats")
        .setDescription("View all your fun command stats in one place")
        .addUserOption((o) => addUserOption(o, { description: "User to view stats for" }))
        .addBooleanOption(addPrivateOption),
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
        .addBooleanOption(addPrivateOption),
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
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("coinflip")
        .setDescription("Flip a coin")
        .addBooleanOption(addPrivateOption),
    )
    .addSubcommand((s) =>
      s
        .setName("coinflipstats")
        .setDescription("View coin flip stats or leaderboard")
        .addStringOption((o) =>
          o
            .setName("view")
            .setDescription("Show user stats or the leaderboard")
            .addChoices(
              { name: "Stats", value: "stats" },
              { name: "Leaderboard", value: "leaderboard" },
            ),
        )
        .addUserOption((o) => addUserOption(o, { description: "User to inspect" }))
        .addIntegerOption((o) =>
          addLimitOption(o, {
            description: "Rows to show",
            min: 1,
            max: 25,
          }),
        )
        .addBooleanOption(addPrivateOption),
    );
}
