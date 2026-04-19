import type { ModalSubmitInteraction } from "discord.js";
import { getContextLogger } from "../../../core/logging/requestContext.js";
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
      await interaction.editReply({ content });
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
    getContextLogger().warn(
      { err, customId: interaction.customId },
      "[interaction] send error reply for modal threw",
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
      getContextLogger().error(
        { err, customId: interaction.customId, interactionId: interaction.id },
        "[interaction] suggestion modal failed",
      );
      await replyOrEditModal(
        interaction,
        "Your suggestion couldn't be posted. Try again, or check that the bot can send messages here.",
      );
    }
  }
}
