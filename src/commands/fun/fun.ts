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
import { run as runRemind } from "./subcommands/remind.js";

import { recordFunUsage, type FunCommandKey } from "../../services/fun/funUsageStore.js";

function userFacingError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (msg.includes("scheduler not initialized")) {
      return "❌ Reminders are not available right now.";
    }

    if (msg.includes("unknown interaction")) {
      return "❌ This command took too long to respond. Please try again.";
    }

    if (msg.includes("missing permissions")) {
      return "❌ I don’t have the required permissions to do that.";
    }

    // Default: show the real message (safe, concise)
    return `❌ ${err.message}`;
  }

  return "❌ An unexpected error occurred.";
}

function parseTempUnit(raw: string | null): TempUnit {
  return raw?.toLowerCase() === "c" ? "c" : "f";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getDiscordErrorCode(err: unknown): number | null {
  if (!isRecord(err)) return null;
  const code = err["code"];
  return typeof code === "number" ? code : null;
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

  // /fun remind
  .addSubcommand((s) =>
    s
      .setName("remind")
      .setDescription("Remind you in X minutes")
      .addIntegerOption((o) =>
        o
          .setName("minutes")
          .setDescription("Minutes from now (1 to 10080)")
          .setMinValue(1)
          .setMaxValue(10080)
          .setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName("message")
          .setDescription("What to remind you about")
          .setMaxLength(1000)
          .setRequired(true),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the confirmation to you")
          .setRequired(false),
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
  };

  return allowed[sub] ?? null;
}

async function maybeRecordUsage(
  interaction: ChatInputCommandInteraction,
  sub: string,
): Promise<void> {
  try {
    if (sub === "remind") {
      await recordFunUsage({
        userId: interaction.user.id,
        command: "remind" as unknown as FunCommandKey,
      });
      return;
    }

    const key = funKeyFromSub(sub);
    if (!key) return;

    await recordFunUsage({ userId: interaction.user.id, command: key });
  } catch (err) {
    logger.warn({ err, sub }, "[fun] failed to record usage");
  }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const group = interaction.options.getSubcommandGroup();
  const sub = interaction.options.getSubcommand(true);

  logger.info({ group: group ?? null, sub, file: import.meta.url }, "[fun] execute");

  // Joke group manages its own replies
  if (group === "joke") {
    try {
      await handleJoke(interaction);
      await recordFunUsage({ userId: interaction.user.id, command: "joke" });
    } catch (err) {
      logger.error({ err, sub, group }, "[fun] joke subcommand failed");
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "Something went wrong. Try again in a bit.",
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.editReply("Something went wrong. Try again in a bit.");
        }
      } catch (replyErr) {
        logger.warn({ replyErr }, "[fun] failed to send joke error reply (ignored)");
      }
    }
    return;
  }

  // Regular subcommands
  const supportsEphemeral = sub !== "poll";
  const wantsEphemeral = supportsEphemeral
    ? (interaction.options.getBoolean("ephemeral") ?? false)
    : false;

  const flags = wantsEphemeral ? MessageFlags.Ephemeral : undefined;

  // IMPORTANT: deferReply is the ack. If it fails with 10062/40060, do not try to reply again.
  try {
    await interaction.deferReply(flags ? { flags } : undefined);
  } catch (err) {
    const code = getDiscordErrorCode(err);

    // 10062: Unknown interaction (expired token) | 40060: already acknowledged
    if (code === 10062 || code === 40060) {
      logger.warn({ code, sub }, "[fun] cannot deferReply (ignored)");
      return;
    }

    logger.error({ err, code, sub }, "[fun] deferReply failed");
    return;
  }

  try {
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

    if (sub === "remind") {
      await runRemind(interaction);
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

    await interaction.editReply(`Unknown subcommand: ${sub}`);
  } catch (err) {
    logger.error({ err, sub }, "[fun] subcommand failed");

    const message = userFacingError(err);

    try {
      await interaction.editReply(message);
    } catch (replyErr) {
      logger.warn({ replyErr }, "[fun] failed to send error reply (ignored)");
    }
  }
}
