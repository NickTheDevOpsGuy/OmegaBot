// src/services/integrations/ai/conversationStore.ts
// Conversation history for ChatGPT-style multi-turn chat. Persisted in SQLite.

import type { ConversationMessage } from "./chatService.js";
import { getDb } from "../../core/database/db.js";

const MAX_MESSAGES = 20;
const MAX_MEMORY_LINES = 6;

export type ChatMode = "supportive" | "casual" | "practical" | "grounding";

export type ConversationProfile = {
  preferredMode: ChatMode;
  memorySummary: string;
  memoryEnabled: boolean;
};

function ensureConversationTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_key TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_profiles (
      conversation_key TEXT PRIMARY KEY,
      preferred_mode TEXT NOT NULL DEFAULT 'supportive',
      memory_summary TEXT NOT NULL DEFAULT '',
      memory_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);
}

export function conversationKey(
  scope: "dm" | "channel",
  userId: string,
  channelId?: string,
): string {
  if (scope === "dm") return `dm:${userId}`;
  return `ch:${channelId ?? ""}:${userId}`;
}

export function getHistory(key: string): ConversationMessage[] {
  ensureConversationTables();
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
  ensureConversationTables();
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
  ensureConversationTables();
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_messages (conversation_key, role, content, created_at) VALUES (?, 'user', ?, ?), (?, 'assistant', ?, ?)`,
  ).run(key, userContent, now, key, assistantContent, now);
  trimToMax(key);
}

export function appendUser(key: string, userContent: string): void {
  ensureConversationTables();
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_messages (conversation_key, role, content, created_at) VALUES (?, 'user', ?, ?)`,
  ).run(key, userContent, now);
  trimToMax(key);
}

export function clear(key: string): void {
  ensureConversationTables();
  const db = getDb();
  db.prepare("DELETE FROM chat_messages WHERE conversation_key = ?").run(key);
  db.prepare("DELETE FROM chat_profiles WHERE conversation_key = ?").run(key);
}

/** Remove the last message (e.g. after a failed turn so the user can retry). */
export function removeLastMessage(key: string): void {
  ensureConversationTables();
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

function normalizeMemoryLine(content: string): string | null {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length < 12) return null;
  if (wantsToClear(normalized)) return null;
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function parseMemoryLines(summary: string): string[] {
  return summary
    .split("\n")
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);
}

function writeProfile(key: string, profile: ConversationProfile): void {
  ensureConversationTables();
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_profiles (conversation_key, preferred_mode, memory_summary, memory_enabled, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(conversation_key) DO UPDATE SET
       preferred_mode = ?,
       memory_summary = ?,
       memory_enabled = ?,
       updated_at = ?`,
  ).run(
    key,
    profile.preferredMode,
    profile.memorySummary,
    profile.memoryEnabled ? 1 : 0,
    now,
    profile.preferredMode,
    profile.memorySummary,
    profile.memoryEnabled ? 1 : 0,
    now,
  );
}

export function getConversationProfile(key: string): ConversationProfile {
  ensureConversationTables();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT preferred_mode, memory_summary, memory_enabled FROM chat_profiles WHERE conversation_key = ?`,
    )
    .get(key) as
    | { preferred_mode: string; memory_summary: string; memory_enabled: number }
    | undefined;

  const preferredMode = (
    row?.preferred_mode === "casual" ||
    row?.preferred_mode === "practical" ||
    row?.preferred_mode === "grounding" ||
    row?.preferred_mode === "supportive"
      ? row.preferred_mode
      : "supportive"
  ) as ChatMode;

  return {
    preferredMode,
    memorySummary: row?.memory_summary ?? "",
    memoryEnabled: row?.memory_enabled !== 0,
  };
}

export function setConversationMode(key: string, mode: ChatMode): void {
  const current = getConversationProfile(key);
  writeProfile(key, { ...current, preferredMode: mode });
}

export function setConversationMemoryEnabled(key: string, enabled: boolean): void {
  const current = getConversationProfile(key);
  writeProfile(key, { ...current, memoryEnabled: enabled });
}

export function clearConversationMemory(key: string): void {
  const current = getConversationProfile(key);
  writeProfile(key, { ...current, memorySummary: "" });
}

export function addConversationMemoryNote(key: string, note: string): void {
  const current = getConversationProfile(key);
  const normalized = normalizeMemoryLine(note);
  if (!normalized) return;
  const lines = parseMemoryLines(current.memorySummary);
  lines.push(normalized);
  const unique = [...new Set(lines)].slice(-MAX_MEMORY_LINES);
  writeProfile(key, {
    ...current,
    memoryEnabled: true,
    memorySummary: unique.map((line) => `- ${line}`).join("\n"),
  });
}

export function updateConversationMemoryFromTurn(key: string, userContent: string): void {
  const current = getConversationProfile(key);
  if (!current.memoryEnabled) return;
  addConversationMemoryNote(key, userContent);
}

export function buildConversationRecap(key: string): string {
  const profile = getConversationProfile(key);
  const history = getHistory(key);
  const recent = history.slice(-6);
  const lines = ["**Conversation recap**", ""];

  if (profile.memorySummary) {
    lines.push("**Saved context**");
    lines.push(profile.memorySummary);
    lines.push("");
  }

  if (recent.length === 0) {
    lines.push("No recent messages yet. Start chatting and I can recap from there.");
    return lines.join("\n");
  }

  lines.push("**Recent turns**");
  for (const item of recent) {
    const speaker = item.role === "user" ? "You" : "Bot";
    const content =
      item.content.length > 180 ? `${item.content.slice(0, 177)}...` : item.content;
    lines.push(`- ${speaker}: ${content}`);
  }

  return lines.join("\n");
}
