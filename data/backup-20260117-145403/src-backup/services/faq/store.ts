// src/services/faq/store.ts
import { getDb } from "../database/db.js";
import type { FaqEntry, FaqStoreV1 } from "./types.js";

export function loadStore(): FaqStoreV1 {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM faqs");
  const rows = stmt.all() as any[];
  
  const entries: Record<string, FaqEntry> = {};
  for (const row of rows) {
    entries[row.key] = {
      key: row.key,
      title: row.title || "",
      body: row.body || row.answer,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      usageCount: row.usage_count || 0,
      createdBy: row.created_by || "unknown",
      updatedBy: row.updated_by || "unknown",
    };
  }
  
  return {
    version: 1,
    entries,
  };
}

export function saveStore(store: FaqStoreV1): void {
  const db = getDb();
  
  db.transaction(() => {
    db.prepare("DELETE FROM faqs").run();
    
    const stmt = db.prepare(`
      INSERT INTO faqs (key, title, body, tags, answer, created_at, updated_at, usage_count, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const faq of Object.values(store.entries)) {
      const answer = faq.title ? `**${faq.title}**\n\n${faq.body}` : faq.body;
      stmt.run(
        faq.key,
        faq.title,
        faq.body,
        JSON.stringify(faq.tags || []),
        answer,
        new Date(faq.createdAt).getTime(),
        new Date(faq.updatedAt).getTime(),
        faq.usageCount || 0,
        faq.createdBy || "unknown",
        faq.updatedBy || "unknown"
      );
    }
  })();
}

export function ensureStoreFile(): void {
  // No-op for SQLite
}
