// src/commands/fun/fun.ts

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";

import { run as runDice } from "./subcommands/dice.js";
import { run as runCoinflip } from "./subcommands/coinflip.js";
import { run as runCoinflipStats } from "./subcommands/coinflipstats.js";
import { run as runPoll } from "./subcommands/poll.js";
import { run as runLeaderboard } from "./subcommands/leaderboard.js";
import type { LeaderboardMode } from "./subcommands/leaderboard.js";

import { run as runWeather } from "./subcommands/weather.js";
import type { WeatherMode, TempUnit } from "../../services/weather/types.js";

import { handleJoke, buildJokeSubcommands } from "./subcommands/joke/index.js";
import { run as runReminders } from "./subcommands/reminders.js";
import { run as runEightball } from "./subcommands/eightball.js";
import { run as runRps } from "./subcommands/rps.js";
import { run as runTrivia } from "./subcommands/trivia.js";
import { run as runQuote } from "./subcommands/quote.js";
import { run as runDaily } from "./subcommands/daily.js";
import { run as runTictactoe } from "./subcommands/tictactoe.js";
import { run as runBlackjack } from "./subcommands/blackjack.js";
import { run as runConnect4 } from "./subcommands/connect4.js";
import { run as runWouldYouRather } from "./subcommands/wouldYouRather.js";
import { run as runFact } from "./subcommands/fact.js";
import { run as runHangman } from "./subcommands/hangman.js";
import { run as runWordle } from "./subcommands/wordle.js";
import { run as runSlots } from "./subcommands/slots.js";
import { run as runStats } from "./subcommands/stats.js";

import { recordFunUsage, type FunCommandKey } from "../../services/fun/funUsageStore.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function deferOpts(ephemeral: boolean): { flags: MessageFlags.Ephemeral } | undefined {
  return ephemeral ? { flags: MessageFlags.Ephemeral } : undefined;
}

function parseTempUnit(raw: string | null): TempUnit {
  return raw?.toLowerCase() === "c" ? "c" : "f";
}

function funKeyFromSub(sub: string): FunCommandKey | null {
  const map: Record<string, FunCommandKey> = {
    dice: "dice",
    coinflip: "coinflip",
    poll: "poll",
    weather: "weather",
    weather7: "weather7",
    leaderboard: "leaderboard",
    joke: "joke",
    "8ball": "8ball",
    rps: "rps",
    trivia: "trivia",
    quote: "quote",
    daily: "daily",
    tictactoe: "tictactoe",
    blackjack: "blackjack",
    connect4: "connect4",
    "would-you-rather": "would-you-rather",
    fact: "fact",
    hangman: "hangman",
    wordle: "wordle",
    slots: "slots",
    stats: "stats",
  };

  return map[sub] ?? null;
}

async function maybeRecordUsage(
  interaction: ChatInputCommandInteraction,
  sub: string,
): Promise<void> {
  try {
    const key = funKeyFromSub(sub);
    if (!key) return;

    await recordFunUsage({
      userId: interaction.user.id,
      command: key,
    });
  } catch (err) {
    logger.warn({ err, sub }, "[fun] usage tracking failed");
  }
}

/* -------------------------------------------------------------------------- */
/* Command Definition                                                         */
/* -------------------------------------------------------------------------- */

export const data = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("Fun and utility commands")

  // /fun joke (subcommand group)
  .addSubcommandGroup(buildJokeSubcommands)

  // /fun quote (subcommand group)
  .addSubcommandGroup((g) =>
    g
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
      ),
  )

  // /fun 8ball
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

  // /fun rps
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

  // /fun trivia
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

  // /fun daily
  .addSubcommand((s) =>
    s
      .setName("daily")
      .setDescription("Daily check-in for points and streaks")
      .addBooleanOption((o) => o.setName("stats").setDescription("Show your daily stats"))
      .addBooleanOption((o) =>
        o.setName("leaderboard").setDescription("Show daily leaderboard"),
      )
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )

  // /fun tictactoe
  .addSubcommand((s) =>
    s
      .setName("tictactoe")
      .setDescription("Play Tic Tac Toe")
      .addUserOption((o) =>
        o.setName("opponent").setDescription("Challenge another player (or play vs bot)"),
      )
      .addBooleanOption((o) =>
        o.setName("stats").setDescription("Show your Tic Tac Toe stats"),
      )
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )
  // /fun blackjack
  .addSubcommand((s) =>
    s
      .setName("blackjack")
      .setDescription("Play a quick game of Blackjack (vs dealer)")
      .addBooleanOption((o) =>
        o.setName("stats").setDescription("Show your blackjack stats"),
      )
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )

  // /fun connect4
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

  // /fun would-you-rather
  .addSubcommand((s) =>
    s
      .setName("would-you-rather")
      .setDescription("Would you rather… vote with buttons")
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )

  // /fun fact
  .addSubcommand((s) =>
    s
      .setName("fact")
      .setDescription("Random interesting fact")
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )

  // /fun hangman
  .addSubcommand((s) =>
    s
      .setName("hangman")
      .setDescription("Play Hangman - guess the word!")
      .addBooleanOption((o) =>
        o.setName("stats").setDescription("Show your Hangman stats"),
      )
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )

  // /fun wordle
  .addSubcommand((s) =>
    s
      .setName("wordle")
      .setDescription("Play the daily Wordle puzzle")
      .addBooleanOption((o) =>
        o.setName("stats").setDescription("Show your Wordle stats"),
      )
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )

  // /fun slots
  .addSubcommand((s) =>
    s
      .setName("slots")
      .setDescription("Spin the slot machine!")
      .addBooleanOption((o) => o.setName("stats").setDescription("Show your slots stats"))
      .addBooleanOption((o) =>
        o.setName("leaderboard").setDescription("Show jackpot leaderboard"),
      )
      .addBooleanOption((o) => o.setName("paytable").setDescription("Show payout table"))
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )

  // /fun stats
  .addSubcommand((s) =>
    s
      .setName("stats")
      .setDescription("View all your fun command stats in one place")
      .addUserOption((o) => o.setName("user").setDescription("User to view stats for"))
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )

  // /fun dice
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

  // /fun coinflip
  .addSubcommand((s) =>
    s
      .setName("coinflip")
      .setDescription("Flip a coin")
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )

  // /fun coinflipstats
  .addSubcommand((s) =>
    s
      .setName("coinflipstats")
      .setDescription("View coin flip stats or leaderboard")
      .addBooleanOption((o) =>
        o.setName("leaderboard").setDescription("Show leaderboard"),
      )
      .addUserOption((o) => o.setName("user").setDescription("User to inspect"))
      .addIntegerOption((o) =>
        o.setName("limit").setDescription("Rows to show").setMinValue(1).setMaxValue(25),
      )
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )

  // /fun poll
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

  // /fun remind (subcommand group)
  .addSubcommandGroup((g) =>
    g
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
      .addSubcommand((s) =>
        s.setName("list").setDescription("View your pending reminders"),
      )
      .addSubcommand((s) =>
        s
          .setName("cancel")
          .setDescription("Cancel a reminder")
          .addIntegerOption((o) =>
            o.setName("id").setDescription("Reminder ID to cancel").setRequired(true),
          ),
      )
      .addSubcommand((s) =>
        s.setName("clear").setDescription("Cancel all your reminders"),
      ),
  )

  // /fun weather
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

  // /fun weather7
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

  // /fun leaderboard
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
      .addUserOption((o) => o.setName("user").setDescription("User for single-user view"))
      .addIntegerOption((o) =>
        o.setName("limit").setDescription("Rows to show").setMinValue(1).setMaxValue(25),
      ),
  );

/* -------------------------------------------------------------------------- */
/* Execution                                                                  */
/* -------------------------------------------------------------------------- */

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(true);

  const ephemeral = interaction.options.getBoolean("private") ?? sub !== "poll"; // polls default public

  await interaction.deferReply(deferOpts(ephemeral));

  try {
    if (group === "joke") {
      await handleJoke(interaction);
      await maybeRecordUsage(interaction, "joke");
      return;
    }

    if (group === "quote") {
      await runQuote(interaction, sub as "add" | "random" | "list" | "remove" | "search");
      await maybeRecordUsage(interaction, "quote");
      return;
    }

    if (sub === "8ball") {
      await runEightball(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "rps") {
      await runRps(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "trivia") {
      await runTrivia(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "daily") {
      await runDaily(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "tictactoe") {
      await runTictactoe(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "blackjack") {
      await runBlackjack(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "connect4") {
      await runConnect4(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "would-you-rather") {
      await runWouldYouRather(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "fact") {
      await runFact(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "hangman") {
      await runHangman(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "wordle") {
      await runWordle(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "slots") {
      await runSlots(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "stats") {
      await runStats(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "dice") {
      await runDice(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "coinflip") {
      await runCoinflip(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "coinflipstats") {
      await runCoinflipStats(interaction);
      return;
    }

    if (sub === "poll") {
      await runPoll(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (group === "remind") {
      await runReminders(interaction, sub as "set" | "list" | "cancel" | "clear");
      return;
    }

    if (sub === "leaderboard") {
      const view = interaction.options.getString("view") ?? "users";
      const limit = interaction.options.getInteger("limit") ?? 10;

      let mode: LeaderboardMode;

      if (view === "commands") {
        mode = { kind: "commands", limit };
      } else if (view === "user") {
        const u = interaction.options.getUser("user");
        mode = { kind: "user", userId: u?.id ?? interaction.user.id };
      } else {
        mode = { kind: "users", limit };
      }

      await runLeaderboard(interaction, mode);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "weather") {
      const location = interaction.options.getString("location", true).trim();
      const unit = parseTempUnit(interaction.options.getString("unit"));

      const mode: WeatherMode = { kind: "daily", location, unit };

      await runWeather(interaction, mode);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "weather7") {
      const location = interaction.options.getString("location", true).trim();
      const unit = parseTempUnit(interaction.options.getString("unit"));

      const mode: WeatherMode = { kind: "7day", location, unit };

      await runWeather(interaction, mode);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    await interaction.editReply("Unknown fun subcommand.");
  } catch (err) {
    logger.error({ err, sub }, "[fun] command failed");
    await interaction.editReply("Something went wrong. Try again later.");
  }
}
