// src/commands/fun/subcommands/remind.ts

import type { ChatInputCommandInteraction } from "discord.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const minutes = interaction.options.getInteger("minutes", true);
  const message = interaction.options.getString("message", true).trim();

  const scheduler = interaction.client.reminderScheduler;
  if (!scheduler) {
    await interaction.editReply(
      "Reminders are not available right now. (Scheduler not initialized)",
    );
    return;
  }

  const dueAtMs = Date.now() + minutes * 60_000;

  const id = scheduler.createAndSchedule({
    userId: interaction.user.id,
    channelId: interaction.channelId,
    message,
    dueAtMs,
  });

  const dueUnix = Math.floor(dueAtMs / 1000);

  await interaction.editReply(`✅ Got it. I’ll remind you <t:${dueUnix}:R> (id: ${id}).`);
}
