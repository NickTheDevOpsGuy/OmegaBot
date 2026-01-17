// src/services/discord/safeReply.ts

import {
  type Interaction,
  type InteractionReplyOptions,
  type InteractionEditReplyOptions,
  MessageFlags,
} from "discord.js";
import { logger } from "../../utils/logger.js";

export type RepliableInteraction = Interaction & {
  reply: (options: InteractionReplyOptions | string) => Promise<unknown>;
  editReply: (options: InteractionEditReplyOptions | string) => Promise<unknown>;
  deferred?: boolean;
  replied?: boolean;
};

export type SafeReplyOptions = InteractionReplyOptions;

export async function safeReply(
  interaction: RepliableInteraction,
  options: SafeReplyOptions | string,
): Promise<void> {
  try {
    const replyOptions: InteractionReplyOptions =
      typeof options === "string"
        ? { content: options, flags: MessageFlags.Ephemeral }
        : options;

    if (interaction.replied || interaction.deferred) {
      // Convert to edit options (only supported fields)
      const editOptions: InteractionEditReplyOptions = {
        content: replyOptions.content,
        embeds: replyOptions.embeds,
        files: replyOptions.files,
        components: replyOptions.components,
      };
      await interaction.editReply(editOptions);
    } else {
      await interaction.reply(replyOptions);
    }
  } catch (err) {
    logger.error({ err, interactionId: interaction.id }, "[safeReply] Failed to reply");
  }
}
