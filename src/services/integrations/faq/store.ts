// src/services/faq/store.ts

import { getDb } from "../../core/database/db.js";
import type { FaqEntry, FaqStoreV1 } from "./types.js";

function parseTags(raw: string): string[] {
  try {
    const tags = JSON.parse(raw) as unknown;
    return Array.isArray(tags)
      ? tags.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

function toEntry(row: {
  key: string;
  title: string;
  body: string;
  tags: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  usage_count: number | null;
}): FaqEntry {
  return {
    key: row.key,
    title: row.title,
    body: row.body,
    tags: parseTags(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? "system",
    updatedBy: row.updated_by ?? "system",
    usageCount: row.usage_count ?? 0,
  };
}

export async function ensureStoreFile(): Promise<void> {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS faqs (
      key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      usage_count INTEGER DEFAULT 0,
      created_by TEXT,
      updated_by TEXT
    );
  `);
}

export async function loadStore(): Promise<FaqStoreV1> {
  await ensureStoreFile();

  const rows = getDb()
    .prepare(
      `SELECT key, title, body, tags, created_at, updated_at, created_by, updated_by, usage_count
       FROM faqs
       ORDER BY key ASC`,
    )
    .all() as Parameters<typeof toEntry>[0][];

  const entries: Record<string, FaqEntry> = {};
  for (const row of rows) {
    const entry = toEntry(row);
    entries[entry.key] = entry;
  }

  return { version: 1, entries };
}

export async function saveStore(store: FaqStoreV1): Promise<void> {
  await ensureStoreFile();

  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM faqs").run();
    const insert = db.prepare(
      `INSERT INTO faqs
        (key, title, body, tags, created_at, updated_at, usage_count, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const entry of Object.values(store.entries)) {
      insert.run(
        entry.key,
        entry.title,
        entry.body,
        JSON.stringify(entry.tags),
        entry.createdAt,
        entry.updatedAt,
        entry.usageCount,
        entry.createdBy,
        entry.updatedBy,
      );
    }
  });

  tx();
}
