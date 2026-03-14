// src/commands/fun/funSubcommands/index.ts
//
// Builds the /fun slash command definition.
// Subcommand groups and subcommand sets are extracted to separate files.

import type { SlashCommandBuilder } from "discord.js";
import { SlashCommandBuilder as SlashCommandBuilderClass } from "discord.js";
import { buildJokeSubcommands } from "../subcommands/social/joke/index.js";
import { buildQuoteGroup } from "./quoteGroup.js";
import { buildHangmanGroup } from "./hangmanGroup.js";
import { addGamesSubcommands } from "./gamesGroup.js";
import { buildUtilityGroup } from "./utilityGroup.js";

export function buildFunCommand(): SlashCommandBuilder {
  // Discord allows max 25 top-level options (groups + subcommands). Remind lives inside utility to stay under the limit.
  const withGroups = new SlashCommandBuilderClass()
    .setName("fun")
    .setDescription("Fun and utility commands")
    .addSubcommandGroup(buildJokeSubcommands)
    .addSubcommandGroup(buildQuoteGroup)
    .addSubcommandGroup(buildHangmanGroup);

  const withGames = addGamesSubcommands(withGroups);

  return withGames.addSubcommandGroup(buildUtilityGroup) as SlashCommandBuilder;
}
