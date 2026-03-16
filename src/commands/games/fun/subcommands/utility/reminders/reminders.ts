// src/commands/fun/subcommands/reminders.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import {
  cancelAllByUser,
  cancelReminder,
  getReminderForUser,
  insertReminder,
  listPendingRemindersByUser,
  updateDueAt,
} from "../../../../../../services/stores/reminders/store.js";
import { getContextLogger } from "../../../../../../services/core/logging/requestContext.js";
import { logger } from "../../../../../../utils/logger.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function formatTimeUntil(dueAt: number): string {
  const diff = dueAt - Date.now();
  if (diff <= 0) return "now";

  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function parseDuration(input: string): number | null {
  const regex = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/i;
  const match = input.replace(/\s/g, "").match(regex);

  if (!match) {
    const num = parseInt(input, 10);
    if (!isNaN(num) && num > 0) return num * 60 * 1000;
    return null;
  }

  const days = parseInt(match[1] || "0", 10);
  const hours = parseInt(match[2] || "0", 10);
  const minutes = parseInt(match[3] || "0", 10);
  if (days === 0 && hours === 0 && minutes === 0) return null;

  const ms = (days * 24 * 60 + hours * 60 + minutes) * 60 * 1000;
  if (ms < 60 * 1000 || ms > 30 * 24 * 60 * 60 * 1000) return null;
  return ms;
}

/* -------------------------------------------------------------------------- */
/* Command Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(
  interaction: ChatInputCommandInteraction,
  action: "set" | "list" | "cancel" | "snooze" | "clear",
): Promise<void> {
  const userId = interaction.user.id;

  if (action === "list") {
    const reminders = listPendingRemindersByUser(userId, 25);
    if (reminders.length === 0) {
      await interaction.editReply("You don't have any pending reminders.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("⏰ Your Reminders")
      .setColor(0x5865f2)
      .setFooter({
        text: `${reminders.length} pending reminder${reminders.length === 1 ? "" : "s"}`,
      });

    const lines = reminders.map((r) => {
      const timeLeft = formatTimeUntil(r.due_at);
      const preview = r.message.length > 50 ? r.message.slice(0, 47) + "..." : r.message;
      return `**#${r.id}** - ${preview}\n└ Due in **${timeLeft}** (<t:${Math.floor(r.due_at / 1000)}:R>)`;
    });
    embed.setDescription(lines.join("\n\n"));
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === "cancel") {
    const reminderId = interaction.options.getInteger("id", true);
    const reminder = getReminderForUser(reminderId, userId);
    if (!reminder) {
      await interaction.editReply(
        `Reminder #${reminderId} not found or doesn't belong to you.`,
      );
      return;
    }

    const cancelled = cancelReminder(reminderId, userId);
    if (cancelled) {
      await interaction.editReply(
        `✅ Cancelled reminder #${reminderId}: "${reminder.message.slice(0, 50)}..."`,
      );
    } else {
      await interaction.editReply(
        `We couldn't cancel reminder #${reminderId}. It may already be gone—check your list.`,
      );
    }
    return;
  }

  if (action === "snooze") {
    const reminderId = interaction.options.getInteger("id", true);
    const timeInput = interaction.options.getString("time", true);

    const reminder = getReminderForUser(reminderId, userId);
    if (!reminder) {
      await interaction.editReply(
        `Reminder #${reminderId} not found or doesn't belong to you.`,
      );
      return;
    }

    const durationMs = parseDuration(timeInput);
    if (!durationMs) {
      await interaction.editReply(
        "Invalid time format. Use formats like: `30m`, `1h`, `1d` (min 1 minute, max 30 days)",
      );
      return;
    }

    const newDueAt = Date.now() + durationMs;
    const updated = updateDueAt(reminderId, userId, newDueAt);
    if (!updated) {
      await interaction.editReply(
        `We couldn't snooze reminder #${reminderId}. Check the time format and try again.`,
      );
      return;
    }

    const timestamp = Math.floor(newDueAt / 1000);
    await interaction.editReply(
      `✅ Reminder #${reminderId} snoozed! I'll remind you <t:${timestamp}:R> (<t:${timestamp}:f>).`,
    );
    return;
  }

  if (action === "clear") {
    const count = cancelAllByUser(userId);
    if (count === 0) {
      await interaction.editReply("You don't have any reminders to clear.");
    } else {
      await interaction.editReply(
        `✅ Cleared ${count} reminder${count === 1 ? "" : "s"}.`,
      );
    }
    return;
  }

  // SET
  const timeInput = interaction.options.getString("time", true);
  const message = interaction.options.getString("message", true);

  const durationMs = parseDuration(timeInput);
  if (!durationMs) {
    await interaction.editReply(
      "Invalid time format. Use formats like: `5m`, `1h`, `1d`, `1h30m` (min 1 minute, max 30 days)",
    );
    return;
  }

  const dueAt = Date.now() + durationMs;
  const channelId = interaction.channelId;
  if (!channelId) {
    await interaction.editReply("Reminders must be set in a channel.");
    return;
  }

  try {
    const id = insertReminder({
      userId,
      channelId,
      message,
      dueAtMs: dueAt,
    });

    const timestamp = Math.floor(dueAt / 1000);
    await interaction.editReply(
      `✅ Reminder #${id} set! I'll remind you <t:${timestamp}:R> (<t:${timestamp}:f>)\n` +
        `> ${message.slice(0, 100)}${message.length > 100 ? "..." : ""}`,
    );

    logger.info({ userId, reminderId: id, dueAt }, "[remind] reminder created");
  } catch (err) {
    getContextLogger().error({ err }, "[remind] create reminder threw");
    await interaction.editReply(
      "We couldn't create that reminder. Check the time format (e.g. 5m, 1h) and try again.",
    );
  }
}
