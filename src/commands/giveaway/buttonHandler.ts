// src/commands/giveaway/buttonHandler.ts
// Handles giveaway enter/leave button clicks.

import type { ButtonInteraction } from "discord.js";
import { logger } from "../../utils/logger.js";
import { recordInteractionRecovery } from "../../services/metrics/server.js";
import { getGiveaway, addEntry, removeEntry, getEntryCount } from "./giveawayStore.js";
import { buildGiveawayEmbed } from "./ui.js";

export async function handleGiveawayButton(
  interaction: ButtonInteraction,
): Promise<void> {
  try {
    const [, giveawayIdStr, action] = interaction.customId.split(":");
    const giveawayId = parseInt(giveawayIdStr, 10);

    const giveaway = getGiveaway(giveawayId);
    if (!giveaway) {
      await interaction.reply({ content: "Giveaway not found.", ephemeral: true });
      return;
    }

    if (giveaway.ended === 1) {
      await interaction.reply({ content: "This giveaway has ended.", ephemeral: true });
      return;
    }

    if (action === "enter") {
      if (giveaway.host_id === interaction.user.id) {
        await interaction.reply({
          content: "You can't enter your own giveaway!",
          ephemeral: true,
        });
        return;
      }

      const success = addEntry(giveawayId, interaction.user.id);
      if (success) {
        await interaction.reply({
          content: "🎉 You've entered the giveaway! Good luck!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({ content: "You're already entered!", ephemeral: true });
      }
    } else if (action === "leave") {
      const success = removeEntry(giveawayId, interaction.user.id);
      if (success) {
        await interaction.reply({
          content: "You've left the giveaway.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({ content: "You weren't entered.", ephemeral: true });
      }
    }

    try {
      const embed = buildGiveawayEmbed(giveaway, getEntryCount(giveawayId));
      await interaction.message.edit({ embeds: [embed] });
    } catch (err) {
      logger.warn({ err, giveawayId }, "[giveaway] failed to update entry count");
    }
  } catch (err) {
    recordInteractionRecovery("giveaway");
    logger.warn(
      { err, interactionFailedRecovery: true },
      "[giveaway] button handler failed",
    );
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferUpdate().catch(() => {});
    }
  }
}
