// src/services/discord/interactionHandler.ts
//
// Central interaction router for Discord.
//
// Responsibilities:
// - Route slash commands to their registered handlers
// - Handle execution errors safely
// - Ensure users always receive a response
//
// IMPORTANT DESIGN NOTE:
// - Slash commands are handled globally here
// - Buttons and other component interactions are handled locally
//   by the command that created them (via collectors)
//
// This separation is REQUIRED for confirmation flows (ex: /faq remove)

import type { Interaction, ChatInputCommandInteraction } from "discord.js";
import type { CommandClient } from "./commandLoader.js";
import { logger } from "../../utils/logger.js";

/**
 * Handle a single Discord interaction.
 *
 * This function is intentionally conservative:
 * - It only routes slash commands
 * - It explicitly ignores buttons so collectors can handle them
 */
export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient,
): Promise<void> {

  /**
   * IMPORTANT:
   * Button interactions (confirm / cancel, etc.) are NOT routed here.
   *
   * They are handled by local collectors created by the command itself
   * (for example: /faq remove confirmation buttons).
   *
   * If we process buttons here, those flows will break.
   */
  if (interaction.isButton()) {
    return;
  }

  /**
   * We only care about slash commands in this router.
   * Other interaction types are intentionally ignored.
   */
  if (!interaction.isChatInputCommand()) return;

  /**
   * Look up the registered command handler.
   */
  const command = client.commands.get(interaction.commandName);

  /**
   * No handler registered for this command.
   * Usually indicates a stale deploy or command mismatch.
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
   * Any error thrown by the command:
   * - Is logged with context
   * - Results in a generic user-facing error
   *
   * Internal details are never leaked to Discord.
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