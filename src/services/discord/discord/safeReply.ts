// src/services/discord/safeReply.ts
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessageEditOptions,
  MessageFlags,
} from "discord.js";
import { getContextLogger, getRequestId } from "../../core/logging/requestContext.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "./interaction/interactionErrors.js";

const RETRY_DELAY_MS = 500;
const MAX_RETRIES = 2;

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("rate limit") ||
      msg.includes("429") ||
      msg.includes("500") ||
      msg.includes("502") ||
      msg.includes("503") ||
      msg.includes("timeout")
    );
  }
  return false;
}

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

  if (options.flags !== undefined) {
    replyOptions.flags = options.flags as number;
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
    if (isKnownInteractionError(error)) {
      logKnownInteractionError(error, "safeReply", {
        commandName: interaction.commandName,
      });
      return;
    }
    const log = getContextLogger();
    log.warn(
      { error, commandName: interaction.commandName, requestId: getRequestId() },
      "reply to interaction threw, trying followUp",
    );
    try {
      await interaction.followUp(replyOptions);
      log.info(
        {
          commandName: interaction.commandName,
          requestId: getRequestId(),
          interactionFailedRecovery: true,
        },
        "Recovered via followUp after initial reply failed",
      );
    } catch (followUpError) {
      if (isKnownInteractionError(followUpError)) {
        logKnownInteractionError(followUpError, "safeReply.followUp", {
          commandName: interaction.commandName,
        });
        return;
      }
      log.error(
        {
          error: followUpError,
          commandName: interaction.commandName,
          requestId: getRequestId(),
        },
        "followUp on interaction threw (interaction may be expired)",
      );
    }
  }
}

/**
 * Safely reply to a button interaction (ephemeral errors).
 * Returns false if the interaction is expired/acked - caller should bail.
 */
export async function safeReplyToButton(
  interaction: ButtonInteraction,
  content: string,
  ephemeral = true,
): Promise<boolean> {
  try {
    await interaction.reply({ content, ephemeral });
    return true;
  } catch (err) {
    if (isKnownInteractionError(err)) {
      logKnownInteractionError(err, "safeReplyToButton", {
        customId: interaction.customId,
      });
      return false;
    }
    throw err;
  }
}

/**
 * Safely defer a button interaction (for update path).
 * Returns false if the interaction is expired/acked - caller should bail.
 */
export async function safeDeferUpdate(interaction: ButtonInteraction): Promise<boolean> {
  try {
    await interaction.deferUpdate();
    return true;
  } catch (err) {
    if (isKnownInteractionError(err)) {
      logKnownInteractionError(err, "safeDeferUpdate", {
        customId: interaction.customId,
      });
      return false;
    }
    throw err;
  }
}

/**
 * Safely edit a deferred reply.
 * Retries on transient errors (rate limit, 5xx).
 * Returns false if the message/interaction is gone - caller should bail.
 */
export async function safeEditReply(
  interaction: ChatInputCommandInteraction,
  options: InteractionEditReplyOptions,
  context?: string,
): Promise<boolean> {
  const log = getContextLogger();
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await interaction.editReply(options);
      return true;
    } catch (err) {
      if (isKnownInteractionError(err)) {
        logKnownInteractionError(err, context ?? "safeEditReply", {
          commandName: interaction.commandName,
        });
        return false;
      }
      if (attempt < MAX_RETRIES && isRetryableError(err)) {
        log.debug(
          {
            attempt: attempt + 1,
            commandName: interaction.commandName,
            requestId: getRequestId(),
          },
          "safeEditReply retrying after transient error",
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  return false;
}

/**
 * Safely edit a message (e.g. in collector "end" handler).
 * Retries on transient errors (rate limit, 5xx).
 * Returns false if the message was deleted (10008).
 */
export async function safeMessageEdit(
  message: Message,
  options: MessageEditOptions,
  context?: string,
): Promise<boolean> {
  const log = getContextLogger();
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await message.edit(options);
      return true;
    } catch (err) {
      if (isKnownInteractionError(err)) {
        logKnownInteractionError(err, context ?? "safeMessageEdit", {
          messageId: message.id,
        });
        return false;
      }
      if (attempt < MAX_RETRIES && isRetryableError(err)) {
        log.debug(
          { attempt: attempt + 1, messageId: message.id, requestId: getRequestId() },
          "safeMessageEdit retrying after transient error",
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  return false;
}
