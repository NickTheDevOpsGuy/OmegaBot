// src/commands/fun/funSubcommands/index.ts
//
// Builds the /fun slash command definition.
// Subcommand groups and subcommand sets are extracted to separate files.

import type { SlashCommandBuilder } from "discord.js";
import { SlashCommandBuilder as SlashCommandBuilderClass } from "discord.js";
import { buildJokeSubcommands } from "../subcommands/social/joke/index.js";
import { buildQuoteGroup } from "./quoteGroup.js";
import { buildHangmanGroup } from "./hangmanGroup.js";
import { buildRemindGroup } from "./remindGroup.js";
import { addGamesSubcommands } from "./gamesGroup.js";
import { addUtilitySubcommands } from "./utilityGroup.js";

export function buildFunCommand(): SlashCommandBuilder {
  // After addSubcommandGroup, builder becomes SlashCommandSubcommandsOnlyBuilder
  const withGroups = new SlashCommandBuilderClass()
    .setName("fun")
    .setDescription("Fun and utility commands")
    .addSubcommandGroup(buildJokeSubcommands)
    .addSubcommandGroup(buildQuoteGroup)
    .addSubcommandGroup(buildHangmanGroup);

  const withGames = addGamesSubcommands(withGroups);
  const withUtility = addUtilitySubcommands(withGames);

  return withUtility.addSubcommandGroup(buildRemindGroup) as SlashCommandBuilder;
}
