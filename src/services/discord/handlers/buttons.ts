import type { ButtonInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../interactionErrors.js";
import { handleGiveawayButton } from "../../../commands/giveaway/buttonHandler.js";

async function replyOrEditButton(
  interaction: ButtonInteraction,
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
      logKnownInteractionError(err, "buttons.replyOrEdit", {
        customId: interaction.customId,
      });
      return;
    }
    logger.warn({ err, customId: interaction.customId }, "[interaction] failed to send error reply");
  }
}

export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId.startsWith("giveaway:")) {
    try {
      await handleGiveawayButton(interaction);
    } catch (err) {
      logger.error(
        { err, customId: interaction.customId, interactionId: interaction.id },
        "[interaction] giveaway button failed",
      );
      await replyOrEditButton(interaction, "Something went wrong with that action. Try again later.");
    }
  }
  // Other button interactions are handled by their respective collectors
}
