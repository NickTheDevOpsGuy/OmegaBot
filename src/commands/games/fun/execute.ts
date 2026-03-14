// src/commands/fun/execute.ts
// Fun command execution: handler registry, usage tracking, subcommand routing.

import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../../../services/discord/discord/interaction/interactionErrors.js";
import { run as runChoose } from "./subcommands/utility/choose/index.js";
import { run as runDice } from "./subcommands/games-a/dice/index.js";
import { run as runCoinflip } from "./subcommands/utility/coinflip/index.js";
import { run as runCoinflipStats } from "./subcommands/utility/coinflipstats/index.js";
import { run as runPoll } from "./subcommands/social/poll/index.js";
import { run as runLeaderboard } from "./subcommands/social/leaderboard/index.js";
import type { LeaderboardMode } from "./subcommands/social/leaderboard/index.js";
import { run as runWeather } from "./subcommands/utility/weather/index.js";
import type { TempUnit } from "../../../services/integrations/weather/types.js";
import { handleJoke } from "./subcommands/social/joke/index.js";
import { run as runReminders } from "./subcommands/utility/reminders/index.js";
import { run as runQuote } from "./subcommands/social/quote/index.js";
import { run as runEightball } from "./subcommands/utility/eightball/index.js";
import { run as runRps } from "./subcommands/games-b/rps/index.js";
import { run as runTrivia } from "./subcommands/games-b/trivia/index.js";
import { run as runDaily } from "./subcommands/games-a/daily/index.js";
import { run as runTictactoe } from "./subcommands/games-b/tictactoe/index.js";
import { run as runBlackjack } from "./subcommands/games-a/blackjack/index.js";
import { run as runConnect4 } from "./subcommands/games-a/connect4/index.js";
import { run as runWouldYouRather } from "./subcommands/social/wouldYouRather/index.js";
import { run as runFact } from "./subcommands/social/fact/index.js";
import { run as runHangman } from "./subcommands/games-a/hangman/index.js";
import { run as runWordle } from "./subcommands/games-b/wordle/index.js";
import { run as runDarts } from "./subcommands/games-a/darts/index.js";
import { run as runSlots } from "./subcommands/games-b/slots/index.js";
import { run as runStats } from "./subcommands/games-b/stats/index.js";
import { run as runChat } from "./subcommands/utility/chat/index.js";
import { run as runChess } from "./subcommands/games-a/chess/index.js";
import { run as runRoast } from "./subcommands/utility/roast/index.js";
import { run as runCompliment } from "./subcommands/utility/compliment/index.js";
import { run as runMemory } from "./subcommands/games-b/memory/index.js";
import { run as runHigherlower } from "./subcommands/games-b/higherlower/index.js";
import { run as runQuest } from "./subcommands/utility/quest/index.js";
import { errMessage, getUserFacingReason } from "../../../utils/errors.js";
import {
  recordFunUsage,
  type FunCommandKey,
} from "../../../services/stores/fun/funUsageStore.js";
import {
  recordDailyPlay,
  type GameCommand,
} from "../../../services/stores/fun/gameUsageMetrics.js";

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
    darts: "darts",
    stats: "stats",
    choose: "choose",
    chat: "chat",
    chess: "chess",
    roast: "roast",
    compliment: "compliment",
    memory: "memory",
    higherlower: "higherlower",
    quest: "quest",
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
  darts: "darts",
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
    logger.warn({ err, sub }, "[fun] usage tracking threw");
  }
}

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
  choose: runChoose,
  dice: runDice,
  coinflip: runCoinflip,
  coinflipstats: runCoinflipStats,
  darts: runDarts,
  poll: runPoll,
  chat: runChat,
  chess: runChess,
  roast: runRoast,
  compliment: runCompliment,
  memory: runMemory,
  higherlower: runHigherlower,
  quest: runQuest,
};

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(true);

  const ephemeral = interaction.options.getBoolean("private") ?? sub !== "poll";

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
    if (group === "hangman") {
      await runHangman(interaction);
      await maybeRecordUsage(interaction, "hangman");
      return;
    }

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
    if (group === "utility" && sub.startsWith("remind_")) {
      const action = sub.slice(7) as "set" | "list" | "cancel" | "snooze" | "clear";
      await runReminders(interaction, action);
      return;
    }

    const handler = HANDLERS[sub];
    if (handler) {
      await handler(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    await interaction.editReply(
      "That command wasn't found. Use `/help topic:fun` to see what's available.",
    );
  } catch (err) {
    if (isKnownInteractionError(err)) {
      logKnownInteractionError(err, "fun.execute", { sub });
      return;
    }
    logger.error({ err, sub }, `[fun] subcommand threw: ${errMessage(err)}`);
    try {
      await interaction.editReply(`❌ ${getUserFacingReason(err)}`);
    } catch (editErr) {
      if (isKnownInteractionError(editErr)) {
        logKnownInteractionError(editErr, "fun.execute fallback edit", { sub });
        return;
      }
      throw editErr;
    }
  }
}
