// src/commands/profile/subcommands/afk.ts
//
// /profile afk [message]

import type { ChatInputCommandInteraction } from "discord.js";
import { getDb } from "../../../../services/core/database/db.js";
import { setAfkStatus, clearAfkStatus } from "../profileHelpers.js";
import { logger } from "../../../../utils/logger.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const message = interaction.options.getString("message");
  const db = getDb();

  if (!message) {
    const cleared = clearAfkStatus(db, interaction.user.id);
    if (cleared) {
      await interaction.reply({
        content: "✅ Welcome back! Your AFK status has been cleared.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({ content: "You weren't AFK.", ephemeral: true });
    }
    return;
  }

  setAfkStatus(db, interaction.user.id, message);
  await interaction.reply({ content: `💤 You're now AFK: ${message}`, ephemeral: false });

  logger.info({ userId: interaction.user.id, message }, "[profile/afk] AFK status set");
}
