import { getDb } from "../database/db.js";

export function initRemindersSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message TEXT NOT NULL,
      due_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      delivered_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_pending_due
      ON reminders(delivered_at, due_at);
  `);
}
