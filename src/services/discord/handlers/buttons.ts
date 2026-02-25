import type { ButtonInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { handleGiveawayButton } from "../../../commands/giveaway/buttonHandler.js";

export async function handleButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (interaction.customId.startsWith("giveaway:")) {
    try {
      await handleGiveawayButton(interaction);
    } catch (err) {
      logger.error(
        { err, customId: interaction.customId },
        "[interaction] giveaway button failed",
      );
    }
  }
  // Other button interactions are handled by their respective collectors
}
