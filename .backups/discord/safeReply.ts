// src/services/discord/safeReply.ts

import {
  type BaseInteraction,
  type InteractionReplyOptions,
  type InteractionEditReplyOptions,
  MessageFlags,
} from "discord.js";
import { logger } from "../../utils/logger.js";

/**
 * Type for interactions that can be replied to.
 * Covers both chat commands and component interactions.
 */
export type RepliableInteraction = BaseInteraction & {
  reply: (options: InteractionReplyOptions | string) => Promise<unknown>;
  editReply: (options: InteractionEditReplyOptions | string) => Promise<unknown>;
  deferred?: boolean;
  replied?: boolean;
};

export type SafeReplyOptions = InteractionReplyOptions;

/**
 * Safely reply to an interaction with error handling.
 * Accepts either string or InteractionReplyOptions.
 */
export async function safeReply(
  interaction: RepliableInteraction,
  options: SafeReplyOptions | string,
): Promise<void> {
  try {
    // Convert string to options object
    const replyOptions: InteractionReplyOptions =
      typeof options === "string"
        ? { content: options, flags: MessageFlags.Ephemeral }
        : options;

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(replyOptions);
    } else {
      await interaction.reply(replyOptions);
    }
  } catch (err) {
    logger.error({ err, interactionId: interaction.id }, "[safeReply] Failed to reply");
  }
}
