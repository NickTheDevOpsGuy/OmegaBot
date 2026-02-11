// src/commands/fun/fun.ts

import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../utils/logger.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../../services/discord/interactionErrors.js";

import { buildFunCommand } from "./funSubcommands.js";

import { run as runDice } from "./subcommands/dice.js";
import { run as runCoinflip } from "./subcommands/coinflip.js";
import { run as runCoinflipStats } from "./subcommands/coinflipstats.js";
import { run as runPoll } from "./subcommands/poll.js";
import { run as runLeaderboard } from "./subcommands/leaderboard.js";
import type { LeaderboardMode } from "./subcommands/leaderboard.js";

import { run as runWeather } from "./subcommands/weather.js";
import type { TempUnit } from "../../services/weather/types.js";

import { handleJoke } from "./subcommands/joke/index.js";
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
import {
  recordDailyPlay,
  type GameCommand,
} from "../../services/fun/gameUsageMetrics.js";

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

const USAGE_TO_METRIC: Partial<Record<FunCommandKey, GameCommand>> = {
  slots: "slots",
  blackjack: "blackjack",
  rps: "rps",
  trivia: "trivia",
  hangman: "hangman",
  wordle: "wordle",
  connect4: "connect4",
  tictactoe: "tictactoe",
  dice: "dice",
  coinflip: "coinflip",
};

async function maybeRecordUsage(
  interaction: ChatInputCommandInteraction,
  sub: string,
): Promise<void> {
  try {
    const key = funKeyFromSub(sub);
    if (!key) return;
    await recordFunUsage({ userId: interaction.user.id, command: key });

    const metric = USAGE_TO_METRIC[key];
    if (metric) {
      recordDailyPlay(interaction.user.id, metric);
    }
  } catch (err) {
    logger.warn({ err, sub }, "[fun] usage tracking failed");
  }
}

/* -------------------------------------------------------------------------- */
/* Handler registry                                                            */
/* -------------------------------------------------------------------------- */

type FunHandler = (i: ChatInputCommandInteraction) => Promise<void>;

const HANDLERS: Record<string, FunHandler> = {
  "8ball": runEightball,
  rps: runRps,
  trivia: runTrivia,
  daily: runDaily,
  tictactoe: runTictactoe,
  blackjack: runBlackjack,
  connect4: runConnect4,
  "would-you-rather": runWouldYouRather,
  fact: runFact,
  wordle: runWordle,
  slots: runSlots,
  stats: runStats,
  dice: runDice,
  coinflip: runCoinflip,
  coinflipstats: runCoinflipStats,
  poll: runPoll,
};

/* -------------------------------------------------------------------------- */
/* Command definition & execution                                              */
/* -------------------------------------------------------------------------- */

export const data = buildFunCommand();

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(true);

  const ephemeral = interaction.options.getBoolean("private") ?? sub !== "poll";

  await interaction.deferReply(deferOpts(ephemeral));

  try {
    // Subcommand groups
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
    if (group === "remind") {
      await runReminders(interaction, sub as "set" | "list" | "cancel" | "clear");
      return;
    }
    if (group === "hangman") {
      await runHangman(interaction);
      await maybeRecordUsage(interaction, "hangman");
      return;
    }

    // Subcommands with custom option parsing
    if (sub === "leaderboard") {
      const view = interaction.options.getString("view") ?? "users";
      const limit = interaction.options.getInteger("limit") ?? 10;
      let mode: LeaderboardMode;
      if (view === "commands") mode = { kind: "commands", limit };
      else if (view === "user")
        mode = {
          kind: "user",
          userId: interaction.options.getUser("user")?.id ?? interaction.user.id,
        };
      else mode = { kind: "users", limit };
      await runLeaderboard(interaction, mode);
      await maybeRecordUsage(interaction, sub);
      return;
    }
    if (sub === "weather") {
      const location = interaction.options.getString("location", true).trim();
      const unit = parseTempUnit(interaction.options.getString("unit"));
      await runWeather(interaction, { kind: "daily", location, unit });
      await maybeRecordUsage(interaction, sub);
      return;
    }
    if (sub === "weather7") {
      const location = interaction.options.getString("location", true).trim();
      const unit = parseTempUnit(interaction.options.getString("unit"));
      await runWeather(interaction, { kind: "7day", location, unit });
      await maybeRecordUsage(interaction, sub);
      return;
    }

    // Registry-based handlers
    const handler = HANDLERS[sub];
    if (handler) {
      await handler(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    await interaction.editReply("Unknown fun subcommand.");
  } catch (err) {
    if (isKnownInteractionError(err)) {
      logKnownInteractionError(err, "fun.execute", { sub });
      return;
    }
    logger.error({ err, sub }, "[fun] command failed");
    try {
      await interaction.editReply("Something went wrong. Try again later.");
    } catch (editErr) {
      if (isKnownInteractionError(editErr)) {
        logKnownInteractionError(editErr, "fun.execute fallback edit", { sub });
        return;
      }
      throw editErr;
    }
  }
}
