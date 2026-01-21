// src/services/discord/commandTypes.ts
import type {
  ChatInputCommandInteraction,
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
   * Optional metadata used by /help rendering and logging.
   */
  adminOnly?: boolean;
  group?: string;
};
