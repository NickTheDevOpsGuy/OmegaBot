// src/commands/fun/subcommands/remind.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { insertReminder } from "../../../services/reminders/store.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const minutes = interaction.options.getInteger("minutes", true);
  const message = interaction.options.getString("message", true).trim();

  if (!message) {
    await interaction.editReply("Please provide a reminder message.");
    return;
  }

  const dueAtMs = Date.now() + minutes * 60 * 1000;

  try {
    const channelId = interaction.channelId;

    insertReminder({
      userId: interaction.user.id,
      channelId,
      message,
      dueAtMs,
    });

    await interaction.editReply(`Got it. I will remind you in ${minutes} minute(s).`);
  } catch (err) {
    logger.error({ err }, "[remind] failed to create reminder");
    await interaction.editReply("Something went wrong while scheduling that reminder.");
  }
}
