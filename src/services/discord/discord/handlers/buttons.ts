import type { ButtonInteraction } from "discord.js";
import { getContextLogger } from "../../../core/logging/requestContext.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../interaction/interactionErrors.js";
import { handleGiveawayButton } from "../../../../commands/games/giveaway/buttonHandler.js";

async function replyOrEditButton(
  interaction: ButtonInteraction,
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
      logKnownInteractionError(err, "buttons.replyOrEdit", {
        customId: interaction.customId,
      });
      return;
    }
    getContextLogger().warn(
      { err, customId: interaction.customId },
      "[interaction] send error reply for button threw",
    );
  }
}

export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId.startsWith("giveaway:")) {
    try {
      await handleGiveawayButton(interaction);
    } catch (err) {
      getContextLogger().error(
        { err, customId: interaction.customId, interactionId: interaction.id },
        "[interaction] giveaway button failed",
      );
      await replyOrEditButton(
        interaction,
        "That button action didn't complete. Try again in a moment.",
      );
    }
  }
  // Other button interactions are handled by their respective collectors
}
