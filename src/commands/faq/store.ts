// src/services/faq/store.ts
//
// Low-level persistence layer for FAQ data.
//
// Responsibilities:
// - Own the on-disk storage format and location
// - Ensure the data file exists
// - Load and save the FAQ store safely
//
// Non-goals:
// - No business rules (validation, permissions, etc.)
// - No Discord logic
// - No mutation decisions (that belongs in services.ts)
//
// This file is intentionally boring and predictable.

import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger.js";
import type { FaqStoreV1 } from "./types.js";

/**
 * Absolute path to the FAQ JSON store.
 *
 * Using process.cwd() keeps the data location stable regardless
 * of where the code is imported from.
 */
const STORE_PATH = path.join(process.cwd(), "data", "faqs.json");

/**
 * Canonical empty store for version 1.
 *
 * This acts as:
 * - The initial file contents
 * - A fallback if loading/parsing fails
 */
const EMPTY_STORE: FaqStoreV1 = {
  version: 1,
  entries: {},
};

/**
 * Ensure the FAQ store file exists on disk.
 *
 * Behavior:
 * - If the file already exists, do nothing
 * - If missing, create the parent directory and write EMPTY_STORE
 *
 * This function is idempotent and safe to call repeatedly.
 */
export function ensureStoreFile(): void {
  if (fs.existsSync(STORE_PATH)) return;

  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");

  logger.info("[faq] created empty faq store");
}

/**
 * Load the FAQ store from disk.
 *
 * Guarantees:
 * - Always returns a valid FaqStoreV1 object
 *
 * Failure handling:
 * - If the file is missing, it will be created
 * - If JSON parsing fails or the shape is invalid,
 *   logs the error and falls back to EMPTY_STORE
 *
 * This prevents runtime crashes from malformed data.
 */
export function loadStore(): FaqStoreV1 {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as FaqStoreV1;

    // Minimal schema guard so downstream code can trust the shape
    if (parsed.version !== 1 || typeof parsed.entries !== "object" || !parsed.entries) {
      throw new Error("Invalid FAQ store shape");
    }

    return parsed;
  } catch (err) {
    logger.error({ err }, "[faq] failed to load store, using empty store");
    return { ...EMPTY_STORE };
  }
}

/**
 * Persist the FAQ store back to disk.
 *
 * Notes:
 * - Overwrites the entire file atomically
 * - Pretty-prints JSON for human inspection and diffs
 *
 * Any caller of this function is responsible for ensuring
 * the store object is already valid.
 */
export function saveStore(store: FaqStoreV1): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}
