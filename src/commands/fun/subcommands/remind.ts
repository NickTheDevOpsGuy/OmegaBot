// src/commands/fun/subcommands/remind.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import type { CommandClient } from "../../../services/discord/commandLoader.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const minutes = interaction.options.getInteger("minutes", true);
  const message = interaction.options.getString("message", true).trim();

  const client = interaction.client as CommandClient;
  const scheduler = client.reminderScheduler;

  if (!scheduler) {
    // fun.ts already deferred; do NOT reply() here
    await interaction.editReply(
      "Reminders are not available right now. (Scheduler not initialized)",
    );
    return;
  }

  if (!message) {
    await interaction.editReply("Please provide a reminder message.");
    return;
  }

  const dueAtMs = Date.now() + minutes * 60 * 1000;

  try {
    // Use the same channel the command was invoked in (best-effort).
    // If this was a DM, channelId is still valid.
    const channelId = interaction.channelId;

    scheduler.createAndSchedule({
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
