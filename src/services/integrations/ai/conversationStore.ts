// src/services/integrations/ai/conversationStore.ts
// Conversation history for ChatGPT-style multi-turn chat. Persisted in SQLite.

import type { ConversationMessage } from "./chatService.js";
import { getDb } from "../../core/database/db.js";

const MAX_MESSAGES = 20;

export function conversationKey(
  scope: "dm" | "channel",
  userId: string,
  channelId?: string,
): string {
  if (scope === "dm") return `dm:${userId}`;
  return `ch:${channelId ?? ""}:${userId}`;
}

export function getHistory(key: string): ConversationMessage[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT role, content FROM chat_messages
       WHERE conversation_key = ?
       ORDER BY created_at ASC`,
    )
    .all(key) as { role: string; content: string }[];

  const trimmed = rows.length <= MAX_MESSAGES ? rows : rows.slice(-MAX_MESSAGES);
  return trimmed.map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.content,
  }));
}

function trimToMax(key: string): void {
  const db = getDb();
  db.prepare(
    `DELETE FROM chat_messages
     WHERE conversation_key = ? AND id NOT IN (
       SELECT id FROM (
         SELECT id FROM chat_messages
         WHERE conversation_key = ?
         ORDER BY created_at DESC
         LIMIT ?
       ) kept
     )`,
  ).run(key, key, MAX_MESSAGES);
}

export function appendAndTrim(
  key: string,
  userContent: string,
  assistantContent: string,
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_messages (conversation_key, role, content, created_at) VALUES (?, 'user', ?, ?), (?, 'assistant', ?, ?)`,
  ).run(key, userContent, now, key, assistantContent, now);
  trimToMax(key);
}

export function appendUser(key: string, userContent: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_messages (conversation_key, role, content, created_at) VALUES (?, 'user', ?, ?)`,
  ).run(key, userContent, now);
  trimToMax(key);
}

export function clear(key: string): void {
  getDb().prepare("DELETE FROM chat_messages WHERE conversation_key = ?").run(key);
}

/** Remove the last message (e.g. after a failed turn so the user can retry). */
export function removeLastMessage(key: string): void {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id FROM chat_messages WHERE conversation_key = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(key) as { id: number } | undefined;
  if (row) db.prepare("DELETE FROM chat_messages WHERE id = ?").run(row.id);
}

const CLEAR_PHRASES = /^(new chat|clear|reset|start over|clear conversation|forget all)/i;

export function wantsToClear(content: string): boolean {
  return CLEAR_PHRASES.test(content.trim());
}
