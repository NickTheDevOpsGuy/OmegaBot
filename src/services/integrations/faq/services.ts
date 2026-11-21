// src/services/faq/services.ts
//
// FAQ business logic layer.
//
// Responsibilities:
// - Validate + normalize inputs (keys, title/body lengths, tags)
// - Read/write the persistent store via store.ts
// - Return domain objects (FaqEntry) to command handlers
//
// Non-goals:
// - Discord interaction handling (that stays in commands)
// - Low-level file I/O details (that stays in store.ts)

import { loadStore, saveStore } from "./store.js";
import { logger } from "../../../utils/logger.js";
import {
  MAX_KEY_LEN,
  MAX_TITLE_LEN,
  MAX_BODY_LEN,
  MAX_TAGS,
  MAX_TAG_LEN,
} from "./types.js";
import type { FaqEntry, CreateFaqInput, UpdateFaqPatch } from "./types.js";

/**
 * Return all FAQ entries (unordered).
 */
export async function getAll(): Promise<FaqEntry[]> {
  const store = await loadStore();
  return Object.values(store.entries);
}

/**
 * Find an entry by key. Returns null when missing.
 */
export async function getByKey(rawKey: string): Promise<FaqEntry | null> {
  const key = assertValidKey(rawKey);
  const store = await loadStore();
  return store.entries[key] ?? null;
}

/**
 * Create a new FAQ entry.
 * Throws if duplicate key or invalid fields.
 */
export async function create(input: CreateFaqInput): Promise<FaqEntry> {
  const key = assertValidKey(input.key);

  const title = input.title.trim();
  if (title.length === 0) throw new Error("FAQ title cannot be empty");
  if (title.length > MAX_TITLE_LEN) {
    throw new Error(`FAQ title too long (max ${MAX_TITLE_LEN})`);
  }

  const body = input.body.trim();
  if (body.length === 0) throw new Error("FAQ body cannot be empty");
  if (body.length > MAX_BODY_LEN) {
    throw new Error(`FAQ body too long (max ${MAX_BODY_LEN})`);
  }

  const tags = normalizeTags(input.tags);

  const store = await loadStore();
  if (store.entries[key]) {
    throw new Error("FAQ with this key already exists");
  }

  const now = new Date().toISOString();

  const entry: FaqEntry = {
    key,
    title,
    body,
    tags,
    createdAt: now,
    updatedAt: now,
    createdBy: input.actor,
    updatedBy: input.actor,
    usageCount: 0,
  };

  store.entries[key] = entry;
  await saveStore(store);

  logger.info({ key, actor: input.actor }, "[faq] created");
  return entry;
}

/**
 * Update an existing FAQ entry (title/body/tags).
 * Throws if key not found or patch fields invalid.
 */
export async function update(rawKey: string, patch: UpdateFaqPatch): Promise<FaqEntry> {
  const key = assertValidKey(rawKey);

  const store = await loadStore();
  const entry = store.entries[key];
  if (!entry) throw new Error(`FAQ not found: ${key}`);

  const now = new Date().toISOString();

  // Title (optional)
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (title.length === 0) throw new Error("FAQ title cannot be empty");
    if (title.length > MAX_TITLE_LEN) {
      throw new Error(`FAQ title too long (max ${MAX_TITLE_LEN})`);
    }
    entry.title = title;
  }

  // Body (optional)
  if (patch.body !== undefined) {
    const body = patch.body.trim();
    if (body.length === 0) throw new Error("FAQ body cannot be empty");
    if (body.length > MAX_BODY_LEN) {
      throw new Error(`FAQ body too long (max ${MAX_BODY_LEN})`);
    }
    entry.body = body;
  }

  // Tags (optional)
  if (patch.tags !== undefined) {
    entry.tags = normalizeTags(patch.tags);
  }

  // Always update audit fields on a successful update call.
  entry.updatedAt = now;
  entry.updatedBy = patch.actor;

  store.entries[key] = entry;
  await saveStore(store);

  logger.info({ key, actor: patch.actor }, "[faq] updated");
  return entry;
}

/**
 * Remove an entry by key.
 * Returns false if missing.
 */
export async function remove(rawKey: string): Promise<boolean> {
  const key = assertValidKey(rawKey);

  const store = await loadStore();
  if (!store.entries[key]) return false;

  delete store.entries[key];
  await saveStore(store);

  logger.info({ key }, "[faq] removed");
  return true;
}

/**
 * Increment usage count for an entry (for analytics/ranking).
 * Returns false if missing.
 */
export async function incrementUsage(rawKey: string): Promise<boolean> {
  const key = assertValidKey(rawKey);

  const store = await loadStore();
  const entry = store.entries[key];
  if (!entry) return false;

  entry.usageCount += 1;
  entry.updatedAt = new Date().toISOString();

  store.entries[key] = entry;
  await saveStore(store);

  return true;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Normalize keys so users can type variations but store is consistent.
 * Example: " How  To  Deploy?! " -> "how-to-deploy"
 */
function normalizeKey(rawKey: string): string {
  return rawKey
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

/**
 * Validate and return a normalized key (single source of truth).
 */
function assertValidKey(rawKey: string): string {
  const key = normalizeKey(rawKey);
  if (key.length === 0) throw new Error("FAQ key cannot be empty");
  if (key.length > MAX_KEY_LEN) {
    throw new Error(`FAQ key too long (max ${MAX_KEY_LEN})`);
  }
  return key;
}

/**
 * Normalize tags:
 * - optional input -> []
 * - trim
 * - drop empties
 * - enforce per-tag max length
 * - de-dupe
 * - enforce max number of tags
 *
 * Note: casing is preserved. If you want lowercased tags, add `.toLowerCase()`.
 */
function normalizeTags(tags?: string[]): string[] {
  if (!tags) return [];

  const cleaned = tags
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.length > MAX_TAG_LEN ? t.slice(0, MAX_TAG_LEN) : t));

  const deduped = Array.from(new Set(cleaned));

  if (deduped.length > MAX_TAGS) {
    return deduped.slice(0, MAX_TAGS);
  }

  return deduped;
}
