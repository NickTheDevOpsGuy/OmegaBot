// src/services/discord/interactionHandler.ts

import type { Interaction, ChatInputCommandInteraction } from "discord.js";
import type { CommandClient } from "./commandLoader.js";
import { logger } from "../../utils/logger.js";

/**
 * Handles incoming Discord interactions and dispatches slash commands
 * to their registered executors.
 *
 * Responsibilities:
 * - Ignore non-slash interactions
 * - Look up the command handler
 * - Execute safely with error handling
 * - Ensure the user always receives a response
 */
export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient,
): Promise<void> {
  /**
   * We only care about slash commands.
   * Other interaction types (buttons, modals, etc.) are ignored here.
   */
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  /**
   * No command registered for this name.
   * This usually indicates a stale command or partial deploy.
   */
  if (!command) {
    logger.warn(
      {
        commandName: interaction.commandName,
        user: interaction.user?.username,
      },
      "Received interaction for unknown command",
    );

    await interaction.reply({
      content: "Command not found.",
      ephemeral: true,
    });
    return;
  }

  /**
   * Execute the command safely.
   *
   * Any thrown error is:
   * - Logged with context
   * - Converted into a generic user-facing message
   *
   * We avoid leaking internal errors to Discord users.
   */
  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    logger.error(
      {
        err,
        commandName: interaction.commandName,
        user: interaction.user?.username,
        guildId: interaction.guildId,
      },
      "Slash command execution failed",
    );

    const message = "Something went wrong while running this command.";

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(message);
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
