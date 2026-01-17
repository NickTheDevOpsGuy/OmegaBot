// src/services/discord/interactionHandler.ts
import type { Interaction } from "discord.js";
import type { CommandClient } from "./commandLoader.js";
import { checkPermissions } from "../permissions/middleware.js";
import { logger } from "../../utils/logger.js";
import { safeReply } from "./safeReply.js";

/**
 * Centralized interaction handler with proper error boundaries.
 * Handles all interaction types (commands, buttons, modals, etc.)
 */
export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient,
): Promise<void> {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(
          {
            commandName: interaction.commandName,
            userId: interaction.user.id,
          },
          "Unknown command invoked",
        );
        await safeReply(interaction, "This command is not recognized.");
        return;
      }

      // Check permissions if command has requirements
      if (command.permissions) {
        const permissionCheck = checkPermissions(interaction, command.permissions);

        if (!permissionCheck.allowed) {
          logger.warn(
            {
              commandName: interaction.commandName,
              userId: interaction.user.id,
              guildId: interaction.guildId,
              reason: permissionCheck.reason,
            },
            "Permission check failed",
          );
          await safeReply(interaction, permissionCheck.reason);
          return;
        }
      }

      // Execute command
      logger.info(
        {
          commandName: interaction.commandName,
          userId: interaction.user.id,
          guildId: interaction.guildId,
        },
        "Executing command",
      );

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(
          {
            error,
            commandName: interaction.commandName,
            userId: interaction.user.id,
            guildId: interaction.guildId,
          },
          "Command execution failed",
        );

        const errorMessage =
          error instanceof Error
            ? `Command failed: ${error.message}`
            : "An unexpected error occurred while executing this command.";

        await safeReply(interaction, errorMessage);
      }
    }

    // Handle button interactions
    else if (interaction.isButton()) {
      logger.debug(
        {
          customId: interaction.customId,
          userId: interaction.user.id,
        },
        "Button interaction received",
      );

      // Button handlers can be registered by commands
      // For now, just acknowledge
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferUpdate().catch(() => {
          // Ignore if already handled
        });
      }
    }

    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
      logger.debug(
        {
          customId: interaction.customId,
          userId: interaction.user.id,
          values: interaction.values,
        },
        "Select menu interaction received",
      );

      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferUpdate().catch(() => {
          // Ignore if already handled
        });
      }
    }

    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      logger.debug(
        {
          customId: interaction.customId,
          userId: interaction.user.id,
        },
        "Modal submission received",
      );

      // Modal handlers would go here
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Modal submission received.",
          ephemeral: true,
        });
      }
    }

    // Handle autocomplete interactions
    else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (command?.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          logger.error(
            {
              error,
              commandName: interaction.commandName,
              userId: interaction.user.id,
            },
            "Autocomplete failed",
          );
        }
      }
    }
  } catch (error) {
    logger.error(
      {
        error,
        interactionType: interaction.type,
        userId: interaction.user?.id,
      },
      "Unhandled error in interaction handler",
    );
  }
}
