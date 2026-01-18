// src/commands/fun/fun.ts

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";

import { run as runDice } from "./subcommands/dice.js";

import { run as runWeather } from "./subcommands/weather.js";
import type { TempUnit, WeatherMode } from "../../services/weather/types.js";

import { run as runCoinflip } from "./subcommands/coinflip.js";
import { run as runPoll } from "./subcommands/poll.js";

import { run as runLeaderboard } from "./subcommands/leaderboard.js";
import type { LeaderboardMode } from "./subcommands/leaderboard.js";

import { handleJoke, buildJokeSubcommands } from "./subcommands/joke/index.js";

import { recordFunUsage, type FunCommandKey } from "../../services/fun/funUsageStore.js";

function parseTempUnit(raw: string | null): TempUnit {
  return raw?.toLowerCase() === "c" ? "c" : "f";
}

export const data = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("Fun commands")

  // /fun joke
  .addSubcommandGroup(buildJokeSubcommands)

  // /fun dice
  .addSubcommand((s) =>
    s
      .setName("dice")
      .setDescription("Roll some dice")
      .addIntegerOption((o) =>
        o
          .setName("sides")
          .setDescription("Number of sides on each die")
          .setMinValue(2)
          .setMaxValue(100)
          .setRequired(false),
      )
      .addIntegerOption((o) =>
        o
          .setName("count")
          .setDescription("How many dice to roll")
          .setMinValue(1)
          .setMaxValue(10)
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  // /fun coinflip
  .addSubcommand((s) =>
    s
      .setName("coinflip")
      .setDescription("Flip a coin")
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  // /fun poll (2–4 options)
  .addSubcommand((s) =>
    s
      .setName("poll")
      .setDescription("Create a quick poll (2–4 options)")
      .addStringOption((o) =>
        o.setName("question").setDescription("Poll question").setRequired(true),
      )
      .addStringOption((o) =>
        o.setName("option1").setDescription("Option 1").setRequired(true),
      )
      .addStringOption((o) =>
        o.setName("option2").setDescription("Option 2").setRequired(true),
      )
      .addStringOption((o) =>
        o.setName("option3").setDescription("Option 3 (optional)").setRequired(false),
      )
      .addStringOption((o) =>
        o.setName("option4").setDescription("Option 4 (optional)").setRequired(false),
      ),
  )

  // /fun weather (daily)
  .addSubcommand((s) =>
    s
      .setName("weather")
      .setDescription("Weather for a location (includes current conditions)")
      .addStringOption((o) =>
        o
          .setName("location")
          .setDescription('City, "City, ST", ZIP, etc.')
          .setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName("unit")
          .setDescription("Temperature unit")
          .addChoices({ name: "F", value: "f" }, { name: "C", value: "c" })
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  // /fun weather7 (7-day)
  .addSubcommand((s) =>
    s
      .setName("weather7")
      .setDescription("7-day forecast (includes current conditions)")
      .addStringOption((o) =>
        o
          .setName("location")
          .setDescription('City, "City, ST", ZIP, etc.')
          .setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName("unit")
          .setDescription("Temperature unit")
          .addChoices({ name: "F", value: "f" }, { name: "C", value: "c" })
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  // /fun leaderboard
  .addSubcommand((s) =>
    s
      .setName("leaderboard")
      .setDescription("Show fun command leaderboard")
      .addStringOption((o) =>
        o
          .setName("view")
          .setDescription("What leaderboard view to show")
          .setRequired(false)
          .addChoices(
            { name: "Top users", value: "users" },
            { name: "Top commands", value: "commands" },
            { name: "Single user", value: "user" },
          ),
      )
      .addUserOption((o) =>
        o
          .setName("user")
          .setDescription("User to inspect (used with view: Single user)")
          .setRequired(false),
      )
      .addIntegerOption((o) =>
        o
          .setName("limit")
          .setDescription("How many results to show (default 10, max 25)")
          .setMinValue(1)
          .setMaxValue(25)
          .setRequired(false),
      ),
  );

function funKeyFromSub(sub: string): FunCommandKey | null {
  const allowed: Record<string, FunCommandKey> = {
    dice: "dice",
    coinflip: "coinflip",
    poll: "poll",
    weather: "weather",
    weather7: "weather7",
    leaderboard: "leaderboard",
    joke: "joke",
  };

  return allowed[sub] ?? null;
}

async function maybeRecordUsage(
  interaction: ChatInputCommandInteraction,
  sub: string,
): Promise<void> {
  const key = funKeyFromSub(sub);
  if (!key) return;

  try {
    await recordFunUsage({ userId: interaction.user.id, command: key });
  } catch (err) {
    logger.warn({ err, sub }, "[fun] failed to record usage");
  }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);

  // Only some subcommands have the "ephemeral" option (poll and joke do not).
  const supportsEphemeral = sub !== "poll" && sub !== "joke";
  const ephemeral = supportsEphemeral
    ? (interaction.options.getBoolean("ephemeral") ?? false)
    : false;

  await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : undefined);

  try {
    if (sub === "joke") {
      await handleJoke(interaction);
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

    if (sub === "poll") {
      await runPoll(interaction);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "leaderboard") {
      const view = interaction.options.getString("view") ?? "users";
      const limit = interaction.options.getInteger("limit") ?? 10;

      if (view === "commands") {
        const mode: LeaderboardMode = { kind: "commands", limit };
        await runLeaderboard(interaction, mode);
      } else if (view === "user") {
        const u = interaction.options.getUser("user");
        const targetId = u?.id ?? interaction.user.id;
        const mode: LeaderboardMode = { kind: "user", userId: targetId };
        await runLeaderboard(interaction, mode);
      } else {
        const mode: LeaderboardMode = { kind: "users", limit };
        await runLeaderboard(interaction, mode);
      }

      await maybeRecordUsage(interaction, sub);
      return;
    }

    if (sub === "weather" || sub === "weather7") {
      const location = interaction.options.getString("location", true).trim();
      const unit = parseTempUnit(interaction.options.getString("unit") ?? "f");

      const mode: WeatherMode =
        sub === "weather"
          ? { kind: "daily", location, unit }
          : { kind: "7day", location, unit };

      await runWeather(interaction, mode);
      await maybeRecordUsage(interaction, sub);
      return;
    }

    await interaction.editReply("Unknown subcommand.");
  } catch (err) {
    logger.error({ err, sub }, "[fun] subcommand failed");
    await interaction.editReply("Something went wrong. Try again in a bit.");
  }
}
