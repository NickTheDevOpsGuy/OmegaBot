// src/services/reminders/store.ts
import type Database from "better-sqlite3";
import { getAll, getDb, getRow } from "../database/db.js";

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
  return getRow<ReminderRow>(db().prepare(`SELECT * FROM reminders WHERE id = ?`), id);
}

/** Returns the reminder only if it belongs to the user and is still pending. */
export function getReminderForUser(id: number, userId: string): ReminderRow | undefined {
  const row = getRow<ReminderRow>(
    db().prepare(
      `SELECT * FROM reminders WHERE id = ? AND user_id = ? AND delivered_at IS NULL`,
    ),
    id,
    userId,
  );
  return row;
}

export function listPendingReminders(): ReminderRow[] {
  return getAll<ReminderRow>(
    db().prepare(
      `SELECT * FROM reminders WHERE delivered_at IS NULL ORDER BY due_at ASC`,
    ),
  );
}

export function listPendingRemindersByUser(userId: string, limit = 100): ReminderRow[] {
  const rows = getAll<ReminderRow>(
    db().prepare(
      `SELECT * FROM reminders WHERE user_id = ? AND delivered_at IS NULL ORDER BY due_at ASC LIMIT ?`,
    ),
    userId,
    limit,
  );
  return rows;
}

export function listDueReminders(nowMs: number): ReminderRow[] {
  return getAll<ReminderRow>(
    db().prepare(
      `SELECT * FROM reminders WHERE delivered_at IS NULL AND due_at <= ? ORDER BY due_at ASC LIMIT 100`,
    ),
    nowMs,
  );
}

/**
 * Backwards compatible alias (older scheduler code imported this name).
 */
export function fetchDueReminders(nowMs: number): ReminderRow[] {
  return listDueReminders(nowMs);
}

export function markDelivered(id: number): void {
  db().prepare(`UPDATE reminders SET delivered_at = ? WHERE id = ?`).run(Date.now(), id);
}

/** Mark a reminder as delivered (cancel) if it belongs to the user. Returns true if updated. */
export function cancelReminder(id: number, userId: string): boolean {
  const result = db()
    .prepare(
      `UPDATE reminders SET delivered_at = ? WHERE id = ? AND user_id = ? AND delivered_at IS NULL`,
    )
    .run(Date.now(), id, userId);
  return result.changes > 0;
}

/** Mark all pending reminders for a user as delivered. Returns count. */
export function cancelAllByUser(userId: string): number {
  const result = db()
    .prepare(
      `UPDATE reminders SET delivered_at = ? WHERE user_id = ? AND delivered_at IS NULL`,
    )
    .run(Date.now(), userId);
  return result.changes;
}

/** Reschedule a reminder. Returns true if updated. */
export function updateDueAt(id: number, userId: string, newDueAtMs: number): boolean {
  const result = db()
    .prepare(
      `UPDATE reminders SET due_at = ? WHERE id = ? AND user_id = ? AND delivered_at IS NULL`,
    )
    .run(newDueAtMs, id, userId);
  return result.changes > 0;
}
