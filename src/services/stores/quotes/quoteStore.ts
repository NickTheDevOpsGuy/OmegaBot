// src/services/quotes/quoteStore.ts
// Shared quote database logic for /fun quote and context menu "Quote"

import { getDb } from "../../core/database/db.js";

export function ensureQuoteTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      quote_text TEXT NOT NULL,
      added_by TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      context TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_quotes_guild ON quotes(guild_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_author ON quotes(guild_id, author_id);
  `);
}

export function addQuote(
  guildId: string,
  authorId: string,
  quoteText: string,
  addedBy: string,
  context?: string,
): number {
  ensureQuoteTable();
  const db = getDb();
  const now = Date.now();

  const result = db
    .prepare(
      `INSERT INTO quotes (guild_id, author_id, quote_text, added_by, added_at, context)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(guildId, authorId, quoteText, addedBy, now, context ?? null);

  return Number(result.lastInsertRowid);
}

export type QuoteAutocompleteItem = { id: number; preview: string };

export function listRecentQuotesForAutocomplete(
  guildId: string,
  limit = 25,
): QuoteAutocompleteItem[] {
  ensureQuoteTable();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, quote_text FROM quotes WHERE guild_id = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(guildId, limit) as { id: number; quote_text: string }[];
  return rows.map((r) => ({
    id: r.id,
    preview: r.quote_text.length > 50 ? r.quote_text.slice(0, 47) + "…" : r.quote_text,
  }));
}
