// src/services/reminders/scheduler.ts
import type { Client } from "discord.js";
import { logger } from "../../utils/logger.js";
import {
  getReminder,
  insertReminder,
  listDueReminders,
  listPendingReminders,
  markDelivered,
  type ReminderRow,
} from "./store.js";

type Options = {
  pollEveryMs?: number;
};

type Sendable = {
  send: (options: { content: string }) => Promise<unknown>;
  isTextBased?: () => boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isSendable(x: unknown): x is Sendable {
  if (!isRecord(x)) return false;

  const send = x["send"];
  if (typeof send !== "function") return false;

  // If it exposes isTextBased, require it to be true
  const isTextBased = x["isTextBased"];
  if (typeof isTextBased === "function") {
    const ok = (isTextBased as () => boolean)();
    if (!ok) return false;
  }

  return true;
}

function getErrorInfo(err: unknown): { code?: number; message: string } {
  if (!isRecord(err)) return { message: String(err) };

  const code = err["code"];
  const message = typeof err["message"] === "string" ? err["message"] : String(err);

  return {
    ...(typeof code === "number" ? { code } : {}),
    message,
  };
}

export class ReminderScheduler {
  private client: Client;
  private timers = new Map<number, NodeJS.Timeout>();
  private pollTimer: NodeJS.Timeout | null = null;
  private pollEveryMs: number;

  constructor(client: Client, opts: Options = {}) {
    this.client = client;
    this.pollEveryMs = opts.pollEveryMs ?? 5000;
  }

  start(): void {
    logger.info({ pollEveryMs: this.pollEveryMs }, "Reminder scheduler started");

    // Schedule everything pending on boot
    try {
      const pending = listPendingReminders();
      logger.info({ count: pending.length }, "[reminders] pending on startup");

      for (const r of pending) {
        this.scheduleRow(r);
      }
    } catch (err) {
      logger.error({ err }, "[reminders] failed to load pending reminders on startup");
    }

    // Poll loop as a safety net (also handles “restart while due”)
    this.pollTimer = setInterval(() => {
      void this.flushDue();
    }, this.pollEveryMs);

    void this.flushDue();
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;

    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();

    logger.info("Reminder scheduler stopped");
  }

  createAndSchedule(input: {
    userId: string;
    channelId: string;
    message: string;
    dueAtMs: number;
  }): number {
    const id = insertReminder(input);
    const row = getReminder(id);

    logger.info(
      {
        id,
        userId: input.userId,
        channelId: input.channelId,
        dueAtMs: input.dueAtMs,
      },
      "[reminders] created",
    );

    if (row) this.scheduleRow(row);
    return id;
  }

  scheduleRow(r: ReminderRow): void {
    const now = Date.now();
    const delay = Math.max(0, r.due_at - now);

    const existing = this.timers.get(r.id);
    if (existing) clearTimeout(existing);

    logger.debug({ id: r.id, delayMs: delay }, "[reminders] scheduled");

    const t = setTimeout(() => {
      this.timers.delete(r.id);
      void this.deliver(r);
    }, delay);

    this.timers.set(r.id, t);
  }

  private async flushDue(): Promise<void> {
    try {
      const due = listDueReminders(Date.now());
      if (due.length > 0) {
        logger.info({ count: due.length }, "[reminders] due reminders");
      }

      for (const r of due) {
        const existing = this.timers.get(r.id);
        if (existing) {
          clearTimeout(existing);
          this.timers.delete(r.id);
        }
        await this.deliver(r);
      }
    } catch (err) {
      logger.error({ err }, "[reminders] flushDue failed");
    }
  }

  private async getSendable(channelId: string): Promise<Sendable | null> {
    try {
      const ch = await this.client.channels.fetch(channelId);
      if (!ch) return null;

      // Some channel types can be partial
      const maybePartial = ch as unknown as { partial?: boolean; fetch?: () => Promise<unknown> };

      if (maybePartial.partial && typeof maybePartial.fetch === "function") {
        const full = await maybePartial.fetch();
        return isSendable(full) ? full : null;
      }

      return isSendable(ch) ? ch : null;
    } catch (err) {
      logger.warn({ channelId, err }, "[reminders] channel fetch failed");
      return null;
    }
  }

  private async deliver(r: ReminderRow): Promise<void> {
    const now = Date.now();

    try {
      const channel = await this.getSendable(r.channel_id);
      if (!channel) {
        logger.warn(
          { id: r.id, channelId: r.channel_id },
          "[reminders] channel not sendable, will retry later",
        );
        return;
      }

      await channel.send({
        content: `<@${r.user_id}> ⏰ Reminder: ${r.message}`,
      });

      markDelivered(r.id);

      logger.info(
        { id: r.id, userId: r.user_id, channelId: r.channel_id, lagMs: now - r.due_at },
        "[reminders] delivered",
      );
    } catch (err) {
      const info = getErrorInfo(err);

      // We intentionally do NOT mark delivered so it retries later.
      logger.warn(
        {
          id: r.id,
          userId: r.user_id,
          channelId: r.channel_id,
          code: info.code,
          message: info.message,
        },
        "[reminders] delivery failed, will retry",
      );
    }
  }
}