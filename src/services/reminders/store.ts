import type Database from "better-sqlite3";
import { getDb } from "../database/db.js";

export type ReminderRow = {
  id: number;
  user_id: string;
  channel_id: string;
  message: string;
  due_at: number;
  created_at: number;
  delivered_at: number | null;
};

function db(): Database.Database {
  return getDb();
}

export function insertReminder(input: {
  userId: string;
  channelId: string;
  message: string;
  dueAtMs: number;
}): number {
  const stmt = db().prepare(`
    INSERT INTO reminders (user_id, channel_id, message, due_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    input.userId,
    input.channelId,
    input.message,
    input.dueAtMs,
    Date.now(),
  );

  return Number(info.lastInsertRowid);
}

export function getReminder(id: number): ReminderRow | undefined {
  return db()
    .prepare(`SELECT * FROM reminders WHERE id = ?`)
    .get(id) as ReminderRow | undefined;
}

export function listPendingReminders(): ReminderRow[] {
  return db()
    .prepare(`
      SELECT * FROM reminders
      WHERE delivered_at IS NULL
      ORDER BY due_at ASC
    `)
    .all() as ReminderRow[];
}

export function listDueReminders(nowMs: number): ReminderRow[] {
  return db()
    .prepare(`
      SELECT * FROM reminders
      WHERE delivered_at IS NULL
        AND due_at <= ?
      ORDER BY due_at ASC
      LIMIT 100
    `)
    .all(nowMs) as ReminderRow[];
}

export function markDelivered(id: number): void {
  db()
    .prepare(`
      UPDATE reminders
      SET delivered_at = ?
      WHERE id = ?
    `)
    .run(Date.now(), id);
}