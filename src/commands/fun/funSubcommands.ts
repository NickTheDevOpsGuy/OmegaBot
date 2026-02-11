// src/commands/fun/funSubcommands.ts
// Slash command definition for /fun - extracted for readability

import type { SlashCommandBuilder, SlashCommandSubcommandGroupBuilder } from "discord.js";
import { SlashCommandBuilder as SlashCommandBuilderClass } from "discord.js";
import { buildJokeSubcommands } from "./subcommands/joke/index.js";

function buildQuoteGroup(g: SlashCommandSubcommandGroupBuilder) {
  return g
    .setName("quote")
    .setDescription("Save and view memorable server quotes")
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Add a new quote")
        .addUserOption((o) =>
          o.setName("author").setDescription("Who said it").setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("text")
            .setDescription("The quote")
            .setRequired(true)
            .setMaxLength(500),
        )
        .addStringOption((o) =>
          o.setName("context").setDescription("Optional context").setMaxLength(200),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("random")
        .setDescription("Get a random quote")
        .addUserOption((o) => o.setName("author").setDescription("Filter by author")),
    )
    .addSubcommand((s) =>
      s
        .setName("list")
        .setDescription("List recent quotes")
        .addUserOption((o) => o.setName("author").setDescription("Filter by author")),
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Remove a quote")
        .addIntegerOption((o) =>
          o.setName("id").setDescription("Quote ID to remove").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("search")
        .setDescription("Search quotes")
        .addStringOption((o) =>
          o.setName("query").setDescription("Search text").setRequired(true),
        ),
    );
}

function buildHangmanGroup(g: SlashCommandSubcommandGroupBuilder) {
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

function buildRemindGroup(g: SlashCommandSubcommandGroupBuilder) {
  return g
    .setName("remind")
    .setDescription("Set and manage reminders")
    .addSubcommand((s) =>
      s
        .setName("set")
        .setDescription("Set a new reminder")
        .addStringOption((o) =>
          o
            .setName("time")
            .setDescription("When (e.g., 5m, 1h, 1d, 1h30m)")
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("message")
            .setDescription("Reminder message")
            .setRequired(true)
            .setMaxLength(500),
        ),
    )
    .addSubcommand((s) => s.setName("list").setDescription("View your pending reminders"))
    .addSubcommand((s) =>
      s
        .setName("cancel")
        .setDescription("Cancel a reminder")
        .addIntegerOption((o) =>
          o.setName("id").setDescription("Reminder ID to cancel").setRequired(true),
        ),
    )
    .addSubcommand((s) => s.setName("clear").setDescription("Cancel all your reminders"));
}

export function buildFunCommand(): SlashCommandBuilder {
  return new SlashCommandBuilderClass()
    .setName("fun")
    .setDescription("Fun and utility commands")
    .addSubcommandGroup(buildJokeSubcommands)
    .addSubcommandGroup(buildQuoteGroup)

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
    .addSubcommandGroup(buildHangmanGroup)
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
        .setName("dice")
        .setDescription("Roll some dice")
        .addIntegerOption((o) =>
          o
            .setName("sides")
            .setDescription("Sides per die")
            .setMinValue(2)
            .setMaxValue(100),
        )
        .addIntegerOption((o) =>
          o
            .setName("count")
            .setDescription("Number of dice")
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
    )

    .addSubcommand((s) =>
      s
        .setName("poll")
        .setDescription("Create a poll")
        .addStringOption((o) =>
          o.setName("question").setDescription("Poll question").setRequired(true),
        )
        .addStringOption((o) =>
          o.setName("option1").setDescription("Option 1").setRequired(true),
        )
        .addStringOption((o) =>
          o.setName("option2").setDescription("Option 2").setRequired(true),
        )
        .addStringOption((o) => o.setName("option3").setDescription("Option 3"))
        .addStringOption((o) => o.setName("option4").setDescription("Option 4")),
    )
    .addSubcommandGroup(buildRemindGroup)
    .addSubcommand((s) =>
      s
        .setName("weather")
        .setDescription("Current weather for a location")
        .addStringOption((o) =>
          o.setName("location").setDescription("City or ZIP").setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("unit")
            .setDescription("Temperature unit")
            .addChoices({ name: "F", value: "f" }, { name: "C", value: "c" }),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )

    .addSubcommand((s) =>
      s
        .setName("weather7")
        .setDescription("7-day forecast for a location")
        .addStringOption((o) =>
          o.setName("location").setDescription("City or ZIP").setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("unit")
            .setDescription("Temperature unit")
            .addChoices({ name: "F", value: "f" }, { name: "C", value: "c" }),
        )
        .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
    )

    .addSubcommand((s) =>
      s
        .setName("leaderboard")
        .setDescription("Fun command leaderboard")
        .addStringOption((o) =>
          o
            .setName("view")
            .setDescription("Leaderboard view")
            .addChoices(
              { name: "Users", value: "users" },
              { name: "Commands", value: "commands" },
              { name: "Single user", value: "user" },
            ),
        )
        .addUserOption((o) =>
          o.setName("user").setDescription("User for single-user view"),
        )
        .addIntegerOption((o) =>
          o
            .setName("limit")
            .setDescription("Rows to show")
            .setMinValue(1)
            .setMaxValue(25),
        ),
    ) as SlashCommandBuilder;
}
