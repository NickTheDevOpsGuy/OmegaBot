// src/services/reminders/scheduler.ts
import type { Client } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { logger } from "../../utils/logger.js";
import { listDueReminders, markDelivered } from "./store.js";

type DiscordApiErrorLike = {
  code?: number;
  message?: string;
  status?: number;
};

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
 * Classify errors so logs stay useful.
 * We downshift expected cases to debug, and keep real problems at warn/error.
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
  // 50035 Invalid Form Body
  if (code === 10003) return { level: "debug", reason: "unknown_channel", code, msg };
  if (code === 10013) return { level: "debug", reason: "unknown_user", code, msg };
  if (code === 50007) return { level: "debug", reason: "dm_disabled", code, msg };
  if (code === 50001) return { level: "debug", reason: "missing_access", code, msg };
  if (code === 50013) return { level: "debug", reason: "missing_permissions", code, msg };

  return { level: "warn", reason: "send_failed", code, msg };
}

function isSendableTextChannel(ch: unknown): ch is {
  send: (payload: { content: string }) => Promise<unknown>;
  isTextBased?: () => boolean;
  guild?: unknown;
  permissionsFor?: (member: unknown) => { has: (perm: bigint) => boolean } | null;
} {
  return (
    !!ch &&
    typeof ch === "object" &&
    "send" in ch &&
    typeof (ch as any).send === "function"
  );
}

function canSendToGuildChannel(channel: any): boolean {
  // If the channel is in a guild, check perms. For DMs, perms don’t apply.
  if (!("guild" in channel) || !channel.guild) return true;

  const me = channel.guild.members?.me;
  if (!me) return true;

  const perms = channel.permissionsFor?.(me);
  if (!perms) return false;

  return (
    perms.has(PermissionFlagsBits.ViewChannel) &&
    perms.has(PermissionFlagsBits.SendMessages)
  );
}

const TIMING_ENABLED = String(process.env.REMINDER_TIMING_LOGS ?? "").trim() === "1";

export function createReminderScheduler(client: Client) {
  let timer: NodeJS.Timeout | null = null;
  let running = false;

  async function trySendToOriginalChannel(args: {
    userId: string;
    channelId: string;
    message: string;
    reminderId: number;
  }): Promise<boolean> {
    const { userId, channelId, message, reminderId } = args;

    try {
      const channel = await client.channels.fetch(channelId);

      if (!channel) {
        logger.debug({ reminderId, channelId }, "[reminders] channel missing");
        return false;
      }

      // must be text-based AND have send()
      const isTextBased =
        "isTextBased" in (channel as any) &&
        typeof (channel as any).isTextBased === "function"
          ? (channel as any).isTextBased()
          : false;

      if (!isTextBased) {
        logger.debug({ reminderId, channelId }, "[reminders] channel not text-based");
        return false;
      }

      if (!isSendableTextChannel(channel)) {
        logger.debug({ reminderId, channelId }, "[reminders] channel not sendable");
        return false;
      }

      if (!canSendToGuildChannel(channel)) {
        logger.debug({ reminderId, channelId }, "[reminders] cannot send (perms)");
        return false;
      }

      await channel.send({
        content: `<@${userId}> ⏰ **Reminder**\n${message}`,
      });

      return true;
    } catch (err) {
      const c = classifySendError(err);
      const payload = {
        reminderId,
        channelId,
        userId,
        reason: c.reason,
        code: c.code,
        msg: c.msg,
      };

      if (c.level === "debug")
        logger.debug(payload, "[reminders] channel delivery failed");
      else if (c.level === "warn")
        logger.warn({ ...payload, err }, "[reminders] channel delivery failed");
      else logger.error({ ...payload, err }, "[reminders] channel delivery failed");

      return false;
    }
  }

  async function trySendDm(args: {
    userId: string;
    message: string;
    reminderId: number;
  }): Promise<boolean> {
    const { userId, message, reminderId } = args;

    try {
      const user = await client.users.fetch(userId);
      await user.send(`⏰ **Reminder**\n${message}`);
      return true;
    } catch (err) {
      const c = classifySendError(err);
      const payload = {
        reminderId,
        userId,
        reason: c.reason,
        code: c.code,
        msg: c.msg,
      };

      if (c.level === "debug") logger.debug(payload, "[reminders] DM delivery failed");
      else if (c.level === "warn")
        logger.warn({ ...payload, err }, "[reminders] DM delivery failed");
      else logger.error({ ...payload, err }, "[reminders] DM delivery failed");

      return false;
    }
  }

  async function deliverOnce(): Promise<void> {
    // Guard: only deliver after ready
    if (typeof (client as any).isReady === "function" && !(client as any).isReady())
      return;

    // Overlap guard
    if (running) {
      logger.debug("[reminders] tick skipped (still running)");
      return;
    }

    running = true;
    const t0 = Date.now();

    try {
      const now = Date.now();
      const due = listDueReminders(now);

      if (due.length === 0) return;

      logger.info({ count: due.length }, "[reminders] delivering due reminders");

      for (const r of due) {
        const sentToChannel = await trySendToOriginalChannel({
          reminderId: r.id,
          channelId: r.channel_id,
          userId: r.user_id,
          message: r.message,
        });

        const delivered =
          sentToChannel ||
          (await trySendDm({
            reminderId: r.id,
            userId: r.user_id,
            message: r.message,
          }));

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
      logger.error({ err }, "[reminders] deliverOnce failed");
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
