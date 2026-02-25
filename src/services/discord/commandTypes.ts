// src/services/discord/commandTypes.ts
import type {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

/**
 * Canonical command module shape stored in `client.commands`.
 */
export type CommandModule = {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;

  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;

  /**
   * Optional autocomplete handler. Call interaction.respond(choices) quickly (≤3s).
   * If a command option uses setAutocomplete(true), implement this to provide suggestions.
   */
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;

  /**
   * Optional metadata used by /help rendering and logging.
   */
  adminOnly?: boolean;
  group?: string;
};
