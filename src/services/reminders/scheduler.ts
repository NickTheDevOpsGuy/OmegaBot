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
  send: (payload: { content: string }) => Promise<unknown>;
};

function isSendableChannel(x: unknown): x is Sendable {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return typeof obj["send"] === "function";
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
    logger.info("Reminder scheduler started");

    for (const r of listPendingReminders()) {
      this.scheduleRow(r);
    }

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
    if (row) this.scheduleRow(row);
    return id;
  }

  private scheduleRow(r: ReminderRow): void {
    const now = Date.now();
    const delay = Math.max(0, r.due_at - now);

    const existing = this.timers.get(r.id);
    if (existing) clearTimeout(existing);

    const t = setTimeout(() => {
      this.timers.delete(r.id);
      void this.deliver(r);
    }, delay);

    this.timers.set(r.id, t);
  }

  private async flushDue(): Promise<void> {
    const due = listDueReminders(Date.now());

    if (due.length) {
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
  }

  private async getSendable(channelId: string): Promise<Sendable | null> {
    try {
      const ch = await this.client.channels.fetch(channelId);

      if (!ch) {
        logger.warn({ channelId }, "[reminders] channel fetch returned null");
        return null;
      }

      // If discord.js returns a partial, fetch it
      if ("partial" in ch && (ch as { partial?: boolean }).partial) {
        const full = await (ch as { fetch: () => Promise<unknown> })
          .fetch()
          .catch((err) => {
            logger.warn({ channelId, err }, "[reminders] channel fetch(partial) failed");
            return null;
          });

        if (!full) return null;
        return isSendableChannel(full) ? full : null;
      }

      return isSendableChannel(ch) ? ch : null;
    } catch (err) {
      logger.warn({ channelId, err }, "[reminders] channel fetch failed");
      return null;
    }
  }

  private async deliver(r: ReminderRow): Promise<void> {
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
      logger.info({ id: r.id }, "[reminders] delivered");
    } catch (err) {
      // Do not mark delivered.
      // Poller will retry, so reminders are not missed after restart or transient errors.
      logger.warn({ id: r.id, err }, "[reminders] delivery failed, will retry");
    }
  }
}
