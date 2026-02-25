import type { ModalSubmitInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { handleModalSubmit as handleSuggestionModal } from "../../../commands/suggestion/suggestion.js";

export async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (interaction.customId.startsWith("suggestion:")) {
    try {
      await handleSuggestionModal(interaction);
    } catch (err) {
      logger.error(
        { err, customId: interaction.customId },
        "[interaction] suggestion modal failed",
      );
    }
  }
}
