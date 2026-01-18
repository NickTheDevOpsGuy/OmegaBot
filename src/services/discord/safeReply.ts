// src/services/discord/safeReply.ts
import type {
  ChatInputCommandInteraction,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  MessageFlags,
} from "discord.js";
import { logger } from "../../utils/logger.js";

export interface SafeReplyOptions {
  content: string;
  flags?: MessageFlags;
  ephemeral?: boolean;
}

/**
 * Safely reply to an interaction, handling already-replied cases.
 */
export async function safeReply(
  interaction: ChatInputCommandInteraction,
  options: SafeReplyOptions,
): Promise<void> {
  const replyOptions: InteractionReplyOptions = {
    content: options.content,
  };

  // Add flags or ephemeral - prefer flags
  if (options.flags !== undefined) {
    replyOptions.flags = options.flags as number; // Cast to number for bitfield
  } else if (options.ephemeral) {
    replyOptions.ephemeral = options.ephemeral;
  }

  try {
    if (interaction.replied || interaction.deferred) {
      const editOptions: InteractionEditReplyOptions = {
        content: options.content,
      };
      await interaction.editReply(editOptions);
    } else {
      await interaction.reply(replyOptions);
    }
  } catch (error) {
    logger.warn(
      { error, commandName: interaction.commandName },
      "Failed to reply to interaction, trying followUp",
    );
    // If reply fails, try followUp as last resort
    try {
      await interaction.followUp(replyOptions);
    } catch (followUpError) {
      logger.error(
        { error: followUpError, commandName: interaction.commandName },
        "Failed to followUp on interaction - interaction may be expired",
      );
    }
  }
}
