// src/commands/fun/fun.ts

import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

import {
  run as runChuckNorris,
  type ChuckNorrisMode,
} from "./subcommands/chucknorris.js";
import { run as runCoinflip } from "./subcommands/coinflip.js";
import { run as runDadjoke } from "./subcommands/dadjoke.js";
import { run as runDice } from "./subcommands/dice.js";
import { run as runWeather } from "./subcommands/weather.js";

export const data = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("Fun commands")
  .addSubcommand((s) =>
    s
      .setName("chucknorris")
      .setDescription("Chuck Norris facts")
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      )
      .addStringOption((o) =>
        o
          .setName("mode")
          .setDescription("How to pick a fact")
          .setRequired(false)
          .addChoices(
            { name: "random", value: "random" },
            { name: "category", value: "category" },
            { name: "search", value: "search" },
          ),
      )
      .addStringOption((o) =>
        o
          .setName("value")
          .setDescription("Category name (for category) or search text (for search)")
          .setRequired(false),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("dadjoke")
      .setDescription("Get a dad joke")
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )
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
  .addSubcommand((s) =>
    s
      .setName("dice")
      .setDescription("Roll a dice")
      .addIntegerOption((o) =>
        o
          .setName("sides")
          .setDescription("Number of sides (default: 6)")
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("weather")
      .setDescription("Get the weather for a location")
      .addStringOption((o) =>
        o
          .setName("location")
          .setDescription("City, State or City, Country")
          .setRequired(true),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();

  // Defer exactly once. Subcommands should only call editReply().
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral });
  }

  if (sub === "chucknorris") {
    const modeOpt = interaction.options.getString("mode") ?? "random";
    const value = (interaction.options.getString("value") ?? "").trim();

    const mode: ChuckNorrisMode =
      modeOpt === "category"
        ? { kind: "category", category: value || "dev" }
        : modeOpt === "search"
          ? { kind: "search", query: value || "code" }
          : { kind: "random" };

    return await runChuckNorris(interaction, mode);
  }

  if (sub === "dadjoke") return await runDadjoke(interaction);
  if (sub === "coinflip") return await runCoinflip(interaction);

  // Let subcommand read its own options (sides) from interaction
  if (sub === "dice") return await runDice(interaction);

  // Let subcommand read its own options (location) from interaction
  if (sub === "weather") return await runWeather(interaction);

  return await interaction.editReply("Unknown fun subcommand.");
}
