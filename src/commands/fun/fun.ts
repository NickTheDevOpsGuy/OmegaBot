// src/commands/fun/fun.ts

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";

import { run as runChuckNorris } from "./subcommands/chucknorris.js";
import type { ChuckNorrisMode } from "./subcommands/chucknorris.js";

import { run as runDadJoke } from "./subcommands/dadjoke.js";
import type { DadJokeMode } from "./subcommands/dadjoke.js";

import { run as runDice } from "./subcommands/dice.js";

import { run as runWeather } from "./subcommands/weather.js";
import type { TempUnit, WeatherMode } from "../../services/weather/types.js";

function parseTempUnit(raw: string | null): TempUnit {
  return raw?.toLowerCase() === "c" ? "c" : "f";
}

export const data = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("Fun commands")

  // /fun chucknorris
  .addSubcommand((s) =>
    s
      .setName("chucknorris")
      .setDescription("Chuck Norris facts (random, category, or search)")
      .addStringOption((o) =>
        o.setName("category").setDescription("Category (optional)").setRequired(false),
      )
      .addStringOption((o) =>
        o.setName("query").setDescription("Search term (optional)").setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

  // /fun dadjoke
  .addSubcommand((s) =>
    s
      .setName("dadjoke")
      .setDescription("Random dad joke (or search)")
      .addStringOption((o) =>
        o.setName("query").setDescription("Search term (optional)").setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )

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

  // /fun weather (daily)
  .addSubcommand((s) =>
    s
      .setName("weather")
      .setDescription("Today’s weather for a location")
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
      .setDescription("7-day forecast for a location")
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
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // Parent command owns the interaction lifecycle
  await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : undefined);

  try {
    if (sub === "chucknorris") {
      const category = interaction.options.getString("category")?.trim();
      const query = interaction.options.getString("query")?.trim();

      const mode: ChuckNorrisMode = query
        ? { kind: "search", query }
        : category
          ? { kind: "category", category }
          : { kind: "random" };

      return await runChuckNorris(interaction, mode);
    }

    if (sub === "dadjoke") {
      const query = interaction.options.getString("search")?.trim() ?? "";

      const mode: DadJokeMode = query ? { kind: "search", query } : { kind: "random" };

      return await runDadJoke(interaction, mode);
    }

    if (sub === "dice") {
      return await runDice(interaction);
    }

    if (sub === "weather" || sub === "weather7") {
      const location = interaction.options.getString("location", true).trim();
      const unit = parseTempUnit(interaction.options.getString("unit") ?? "f");

      const mode: WeatherMode =
        sub === "weather"
          ? { kind: "daily", location, unit }
          : { kind: "7day", location, unit };

      return await runWeather(interaction, mode);
    }

    await interaction.editReply("Unknown subcommand.");
  } catch (err) {
    logger.error({ err, sub }, "[fun] subcommand failed");
    await interaction.editReply("Something went wrong. Try again in a bit.");
  }
}
