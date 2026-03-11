import type { ModalSubmitInteraction } from "discord.js";
import { logger } from "../../../../utils/logger.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../interaction/interactionErrors.js";
import { handleModalSubmit as handleSuggestionModal } from "../../../../commands/core/suggestion/suggestion.js";

async function replyOrEditModal(
  interaction: ModalSubmitInteraction,
  content: string,
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content }).catch(() => {});
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  } catch (err) {
    if (isKnownInteractionError(err)) {
      logKnownInteractionError(err, "modals.replyOrEdit", {
        customId: interaction.customId,
      });
      return;
    }
    logger.warn(
      { err, customId: interaction.customId },
      "[interaction] failed to send error reply",
    );
  }
}

export async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (interaction.customId.startsWith("suggestion:")) {
    try {
      await handleSuggestionModal(interaction);
    } catch (err) {
      logger.error(
        { err, customId: interaction.customId, interactionId: interaction.id },
        "[interaction] suggestion modal failed",
      );
      await replyOrEditModal(
        interaction,
        "Something went wrong submitting your suggestion. Try again later.",
      );
    }
  }
}
