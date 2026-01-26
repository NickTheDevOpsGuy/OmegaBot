// src/commands/fun/subcommands/reminders.ts
import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getDb } from "../../../services/database/db.js";
import { logger } from "../../../utils/logger.js";

/* -------------------------------------------------------------------------- */
/* Database Helpers                                                            */
/* -------------------------------------------------------------------------- */

type Reminder = {
  id: number;
  user_id: string;
  channel_id: string;
  message: string;
  due_at: number;
  created_at: number;
  delivered_at: number | null;
};

function getUserReminders(userId: string): Reminder[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM reminders 
       WHERE user_id = ? AND delivered_at IS NULL 
       ORDER BY due_at ASC 
       LIMIT 25`,
    )
    .all(userId) as Reminder[];
}

function getReminder(reminderId: number, userId: string): Reminder | null {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM reminders WHERE id = ? AND user_id = ?`)
    .get(reminderId, userId) as Reminder | null;
}

function cancelReminder(reminderId: number, userId: string): boolean {
  const db = getDb();
  // Mark as delivered so it won't be sent
  const result = db
    .prepare(
      `UPDATE reminders SET delivered_at = ? WHERE id = ? AND user_id = ? AND delivered_at IS NULL`,
    )
    .run(Date.now(), reminderId, userId);
  return result.changes > 0;
}

function cancelAllReminders(userId: string): number {
  const db = getDb();
  const result = db
    .prepare(`UPDATE reminders SET delivered_at = ? WHERE user_id = ? AND delivered_at IS NULL`)
    .run(Date.now(), userId);
  return result.changes;
}

function createReminder(data: {
  userId: string;
  channelId: string;
  message: string;
  dueAt: number;
}): number {
  const db = getDb();
  const now = Date.now();

  const result = db
    .prepare(
      `INSERT INTO reminders (user_id, channel_id, message, due_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(data.userId, data.channelId, data.message, data.dueAt, now);

  return Number(result.lastInsertRowid);
}

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
  // Support formats: 5m, 1h, 1d, 1h30m, etc.
  const regex = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/i;
  const match = input.replace(/\s/g, "").match(regex);

  if (!match) {
    // Try simple number (assume minutes)
    const num = parseInt(input, 10);
    if (!isNaN(num) && num > 0) {
      return num * 60 * 1000;
    }
    return null;
  }

  const days = parseInt(match[1] || "0", 10);
  const hours = parseInt(match[2] || "0", 10);
  const minutes = parseInt(match[3] || "0", 10);

  if (days === 0 && hours === 0 && minutes === 0) return null;

  const ms = (days * 24 * 60 + hours * 60 + minutes) * 60 * 1000;

  // Min 1 minute, max 30 days
  if (ms < 60 * 1000 || ms > 30 * 24 * 60 * 60 * 1000) return null;

  return ms;
}

/* -------------------------------------------------------------------------- */
/* Command Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(
  interaction: ChatInputCommandInteraction,
  action: "set" | "list" | "cancel" | "clear",
): Promise<void> {
  const userId = interaction.user.id;

  // LIST
  if (action === "list") {
    const reminders = getUserReminders(userId);

    if (reminders.length === 0) {
      await interaction.editReply("You don't have any pending reminders.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("⏰ Your Reminders")
      .setColor(0x5865f2)
      .setFooter({ text: `${reminders.length} pending reminder${reminders.length === 1 ? "" : "s"}` });

    const lines = reminders.map((r) => {
      const timeLeft = formatTimeUntil(r.due_at);
      const preview = r.message.length > 50 ? r.message.slice(0, 47) + "..." : r.message;
      return `**#${r.id}** - ${preview}\n└ Due in **${timeLeft}** (<t:${Math.floor(r.due_at / 1000)}:R>)`;
    });

    embed.setDescription(lines.join("\n\n"));

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // CANCEL
  if (action === "cancel") {
    const reminderId = interaction.options.getInteger("id", true);

    const reminder = getReminder(reminderId, userId);
    if (!reminder) {
      await interaction.editReply(`Reminder #${reminderId} not found or doesn't belong to you.`);
      return;
    }

    const cancelled = cancelReminder(reminderId, userId);
    if (cancelled) {
      await interaction.editReply(`✅ Cancelled reminder #${reminderId}: "${reminder.message.slice(0, 50)}..."`);
    } else {
      await interaction.editReply(`Failed to cancel reminder #${reminderId}.`);
    }
    return;
  }

  // CLEAR
  if (action === "clear") {
    const count = cancelAllReminders(userId);
    if (count === 0) {
      await interaction.editReply("You don't have any reminders to clear.");
    } else {
      await interaction.editReply(`✅ Cleared ${count} reminder${count === 1 ? "" : "s"}.`);
    }
    return;
  }

  // SET (default)
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

  try {
    const id = createReminder({
      userId,
      channelId: interaction.channelId,
      message,
      dueAt,
    });

    const timestamp = Math.floor(dueAt / 1000);
    await interaction.editReply(
      `✅ Reminder #${id} set! I'll remind you <t:${timestamp}:R> (<t:${timestamp}:f>)\n` +
      `> ${message.slice(0, 100)}${message.length > 100 ? "..." : ""}`,
    );

    logger.info({ userId, reminderId: id, dueAt }, "[remind] reminder created");
  } catch (err) {
    logger.error({ err }, "[remind] failed to create reminder");
    await interaction.editReply("Failed to create reminder. Please try again.");
  }
}
