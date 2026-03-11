// src/services/reminders/scheduler.ts
// Background loop: fetch due reminders, DM users, mark delivered. Runs on bot ready.
import type { Client } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { listDueReminders, markDelivered, type ReminderRow } from "./store.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function getDiscordErrorCode(err: unknown): number | null {
  if (!isRecord(err)) return null;
  const code = err["code"];
  return typeof code === "number" ? code : null;
}

function getDiscordErrorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  if (isRecord(err) && typeof err["message"] === "string") return err["message"];
  return null;
}

/**
 * Classify send errors so logs stay useful.
 */
function classifySendError(err: unknown): {
  level: "debug" | "warn" | "error";
  reason: string;
  code: number | null;
  msg: string | null;
} {
  const code = getDiscordErrorCode(err);
  const msg = getDiscordErrorMessage(err);

  // Common Discord REST codes:
  // 10003 Unknown Channel
  // 10013 Unknown User
  // 50001 Missing Access
  // 50013 Missing Permissions
  // 50007 Cannot send messages to this user
  if (code === 10003) return { level: "debug", reason: "unknown_channel", code, msg };
  if (code === 10013) return { level: "debug", reason: "unknown_user", code, msg };
  if (code === 50007) return { level: "debug", reason: "dm_disabled", code, msg };
  if (code === 50001) return { level: "debug", reason: "missing_access", code, msg };
  if (code === 50013) return { level: "debug", reason: "missing_permissions", code, msg };

  return { level: "warn", reason: "send_failed", code, msg };
}

function canSendToGuildChannel(client: Client, channel: unknown): boolean {
  // If it's not a guild channel (DM, Group DM, etc.), perms do not apply.
  if (!isRecord(channel) || !("guild" in channel)) return true;

  const guild = (channel as { guild?: unknown }).guild;
  if (!guild) return true;

  // Try to find the bot member
  const members = (guild as { members?: { me?: unknown } }).members;
  const me = members?.me;
  if (!me) return true;

  const permissionsFor = (
    channel as {
      permissionsFor?: (member: unknown) => { has: (perm: bigint) => boolean } | null;
    }
  ).permissionsFor;

  if (typeof permissionsFor !== "function") return true;

  const perms = permissionsFor(me);
  if (!perms) return false;

  return (
    perms.has(PermissionFlagsBits.ViewChannel) &&
    perms.has(PermissionFlagsBits.SendMessages)
  );
}

function formatReminderMessage(r: ReminderRow): string {
  return `<@${r.user_id}> ⏰ **Reminder**\n${r.message}`;
}

const TIMING_ENABLED = String(process.env.REMINDER_TIMING_LOGS ?? "").trim() === "1";

export function createReminderScheduler(client: Client) {
  let timer: NodeJS.Timeout | null = null;
  let running = false;

  async function trySendToOriginalChannel(r: ReminderRow): Promise<boolean> {
    const reminderId = r.id;

    try {
      const channel = await client.channels.fetch(r.channel_id);

      if (!channel) {
        logger.debug(
          { reminderId, channelId: r.channel_id },
          "[reminders] channel missing",
        );
        return false;
      }

      if (!channel.isTextBased()) {
        logger.debug(
          { reminderId, channelId: r.channel_id },
          "[reminders] channel not text-based",
        );
        return false;
      }

      // Type guard: not all text-based unions expose send()
      if (!("send" in channel) || typeof channel.send !== "function") {
        logger.debug(
          { reminderId, channelId: r.channel_id },
          "[reminders] channel has no send()",
        );
        return false;
      }

      if (!canSendToGuildChannel(client, channel)) {
        logger.debug(
          { reminderId, channelId: r.channel_id },
          "[reminders] cannot send (perms)",
        );
        return false;
      }

      await channel.send({ content: formatReminderMessage(r) });
      return true;
    } catch (err) {
      const c = classifySendError(err);
      const payload = {
        reminderId,
        channelId: r.channel_id,
        userId: r.user_id,
        reason: c.reason,
        code: c.code,
        msg: c.msg,
      };

      if (c.level === "debug")
        logger.debug(payload, "[reminders] channel delivery failed");
      else if (c.level === "warn")
        logger.warn({ ...payload, err }, "[reminders] channel delivery threw");
      else logger.error({ ...payload, err }, "[reminders] channel delivery threw");

      return false;
    }
  }

  async function trySendDm(r: ReminderRow): Promise<boolean> {
    const reminderId = r.id;

    try {
      const user = await client.users.fetch(r.user_id);
      await user.send(`⏰ **Reminder**\n${r.message}`);
      return true;
    } catch (err) {
      const c = classifySendError(err);
      const payload = {
        reminderId,
        userId: r.user_id,
        reason: c.reason,
        code: c.code,
        msg: c.msg,
      };

      if (c.level === "debug") logger.debug(payload, "[reminders] DM delivery failed");
      else if (c.level === "warn")
        logger.warn({ ...payload, err }, "[reminders] DM delivery threw");
      else logger.error({ ...payload, err }, "[reminders] DM delivery threw");

      return false;
    }
  }

  async function deliverOnce(): Promise<void> {
    if (typeof client.isReady === "function" && !client.isReady()) return;

    if (running) {
      logger.debug("[reminders] tick skipped (still running)");
      return;
    }

    running = true;
    const t0 = Date.now();

    try {
      const due = listDueReminders(Date.now());
      if (due.length === 0) return;

      logger.info({ count: due.length }, "[reminders] delivering due reminders");

      for (const r of due) {
        const sentToChannel = await trySendToOriginalChannel(r);
        const delivered = sentToChannel || (await trySendDm(r));

        if (delivered) {
          markDelivered(r.id);
          logger.info(
            { reminderId: r.id, userId: r.user_id, channelId: r.channel_id },
            "[reminders] delivered",
          );
        } else {
          logger.warn(
            { reminderId: r.id, userId: r.user_id, channelId: r.channel_id },
            "[reminders] not delivered (no valid destination)",
          );
        }
      }
    } catch (err) {
      logger.error({ err }, "[reminders] deliverOnce threw");
    } finally {
      running = false;

      if (TIMING_ENABLED) {
        logger.debug({ ms: Date.now() - t0 }, "[reminders] deliverOnce timing");
      }
    }
  }

  return {
    start() {
      if (timer) return;

      timer = setInterval(() => {
        void deliverOnce();
      }, 30_000);

      logger.info("[reminders] scheduler started");
    },

    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      logger.info("[reminders] scheduler stopped");
    },
  };
}
