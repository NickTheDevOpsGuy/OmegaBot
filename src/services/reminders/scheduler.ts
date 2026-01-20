// src/services/reminders/scheduler.ts
import type { Client } from "discord.js";
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

function isSendable(x: unknown): x is Sendable {
  if (!x || typeof x !== "object") return false;

  const obj = x as Record<string, unknown>;
  if (typeof obj.send !== "function") return false;

  // If it exposes isTextBased, require it to be true
  if (typeof obj.isTextBased === "function") {
    const fn = obj.isTextBased as () => boolean;
    if (!fn()) return false;
  }

  return true;
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

  scheduleRow(r: ReminderRow): void {
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
    for (const r of due) {
      const existing = this.timers.get(r.id);
      if (existing) {
        clearTimeout(existing);
        this.timers.delete(r.id);
      }
      await this.deliver(r);
    }
  }

  private async getSendableChannel(channelId: string): Promise<Sendable | null> {
    const ch = await this.client.channels.fetch(channelId);
    if (!ch) return null;

    // Handle partial channels
    if ("partial" in ch && Boolean((ch as { partial?: boolean }).partial)) {
      const fetched = await (ch as { fetch: () => Promise<unknown> }).fetch();
      return isSendable(fetched) ? fetched : null;
    }

    return isSendable(ch) ? ch : null;
  }

  private async deliver(r: ReminderRow): Promise<void> {
    try {
      const channel = await this.getSendableChannel(r.channel_id);
      if (!channel) return;

      await channel.send({
        content: `<@${r.user_id}> ⏰ Reminder: ${r.message}`,
      });

      markDelivered(r.id);
    } catch {
      // Do not mark delivered.
      // Poller will retry, so reminders are not missed after restart or transient errors.
    }
  }
}
