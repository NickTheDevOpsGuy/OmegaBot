// src/services/faq/services.ts

import { loadStore, saveStore } from "./store.js";
import { logger } from "../../utils/logger.js";
import { MAX_KEY_LEN, type CreateFaqInput, type FaqEntry } from "./types.js";

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Return all FAQ entries.
 *
 * Note:
 * - Returns values only (does not guarantee order).
 * - Caller can sort if needed (ex: by usageCount or updatedAt).
 */
export function getAll(): FaqEntry[] {
  const store = loadStore();
  return Object.values(store.entries);
}

/**
 * Lookup an FAQ by key.
 *
 * The key is normalized the same way as create/update/remove.
 */
export function getByKey(key: string): FaqEntry | null {
  const store = loadStore();
  const k = assertValidKey(key);
  return store.entries[k] ?? null;
}

/**
 * Create a new FAQ entry.
 *
 * Throws if:
 * - key normalizes to empty
 * - key is too long
 * - key already exists
 */
export function create(input: CreateFaqInput): FaqEntry {
  const store = loadStore();

  const key = assertValidKey(input.key);
  if (store.entries[key]) {
    throw new Error(`FAQ with this key already exists: ${key}`);
  }

  const now = new Date().toISOString();

  const entry: FaqEntry = {
    key,
    title: input.title.trim(),
    body: input.body.trim(),
    tags: normalizeTags(input.tags ?? []),
    createdAt: now,
    updatedAt: now,
    createdBy: input.actor,
    updatedBy: input.actor,
    usageCount: 0,
  };

  store.entries[key] = entry;
  saveStore(store);

  return entry;
}

/**
 * Allowed update fields for an FAQ.
 * actor is required so we can attribute updatedBy.
 */
export type UpdateFaqPatch = Partial<Pick<FaqEntry, "title" | "body" | "tags">> & {
  actor: string;
};

/**
 * Update an existing FAQ entry by key.
 *
 * Throws if:
 * - key invalid
 * - entry not found
 */
export function update(key: string, patch: UpdateFaqPatch): FaqEntry {
  const k = assertValidKey(key);

  const store = loadStore();
  const existing = store.entries[k];

  if (!existing) {
    throw new Error(`FAQ not found: ${k}`);
  }

  // Apply patch (only touch provided fields).
  if (patch.title !== undefined) existing.title = patch.title.trim();
  if (patch.body !== undefined) existing.body = patch.body.trim();
  if (patch.tags !== undefined) existing.tags = normalizeTags(patch.tags);

  existing.updatedAt = new Date().toISOString();
  existing.updatedBy = patch.actor;

  store.entries[k] = existing;
  saveStore(store);

  return existing;
}

/**
 * Remove an FAQ by key.
 *
 * Returns:
 * - true if removed
 * - false if it did not exist
 */
export function remove(key: string): boolean {
  const store = loadStore();
  const k = assertValidKey(key);

  if (!store.entries[k]) return false;

  delete store.entries[k];
  saveStore(store);
  return true;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Normalize an FAQ key into a stable URL-ish slug.
 *
 * Example:
 *  "How do I reset my token?" -> "how-do-i-reset-my-token"
 */
function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

/**
 * Validate and return the normalized key.
 *
 * Keep this throwing:
 * - Callers can catch at the command layer and reply nicely.
 * - Services stay strict and predictable.
 */
function assertValidKey(key: string): string {
  const k = normalizeKey(key);

  if (k.length === 0) {
    throw new Error("FAQ key is empty after normalization");
  }

  if (k.length > MAX_KEY_LEN) {
    throw new Error(`FAQ key too long (max ${MAX_KEY_LEN})`);
  }

  return k;
}

/**
 * Normalize tags for consistency:
 * - trim
 * - lowercase
 * - remove empties
 * - de-dupe
 */
function normalizeTags(tags: string[]): string[] {
  const cleaned = tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0);

  return Array.from(new Set(cleaned));
}
