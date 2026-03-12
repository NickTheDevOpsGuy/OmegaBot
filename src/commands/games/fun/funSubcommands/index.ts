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
import { buildRemindGroup } from "./remindGroup.js";
import { buildUtilityGroup } from "./utilityGroup.js";

export function buildFunCommand(): SlashCommandBuilder {
  // Discord allows max 25 top-level options (groups + subcommands). We use groups for joke, quote, hangman, utility, remind; flat subcommands for games.
  const withGroups = new SlashCommandBuilderClass()
    .setName("fun")
    .setDescription("Fun and utility commands")
    .addSubcommandGroup(buildJokeSubcommands)
    .addSubcommandGroup(buildQuoteGroup)
    .addSubcommandGroup(buildHangmanGroup);

  const withGames = addGamesSubcommands(withGroups);
  const withUtility = withGames.addSubcommandGroup(buildUtilityGroup);

  return withUtility.addSubcommandGroup(buildRemindGroup) as SlashCommandBuilder;
}
