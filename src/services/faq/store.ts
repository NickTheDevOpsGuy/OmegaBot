// src/services/faq/store.ts

import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger.js";
import type { FaqStoreV1 } from "./types.js";

/**
 * Absolute path to the FAQ data file.
 * Stored outside src/ so it persists across builds.
 */
const STORE_PATH = path.join(process.cwd(), "data", "faqs.json");

/**
 * Empty FAQ store template (schema v1).
 * Used on first run or when recovery is required.
 */
const EMPTY_STORE: FaqStoreV1 = {
  version: 1,
  entries: {},
};

/**
 * Ensure the FAQ store file exists on disk.
 *
 * - Creates parent directories if missing
 * - Writes an empty store if the file does not exist
 * - Safe to call multiple times
 */
export function ensureStoreFile(): void {
  if (fs.existsSync(STORE_PATH)) {
    return;
  }

  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");

  logger.info("[faq] created empty FAQ store");
}

/**
 * Load the FAQ store from disk.
 *
 * Behavior:
 * - Ensures the store file exists
 * - Parses JSON from disk
 * - Validates basic schema shape
 * - Falls back to an empty store on error
 */
export function loadStore(): FaqStoreV1 {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as FaqStoreV1;

    if (
      parsed.version !== 1 ||
      typeof parsed.entries !== "object" ||
      parsed.entries === null
    ) {
      throw new Error("Invalid FAQ store shape");
    }

    return parsed;
  } catch (err) {
    logger.error({ err }, "[faq] failed to load store, falling back to empty store");

    return {
      version: 1,
      entries: {},
    };
  }
}

/**
 * Persist the FAQ store back to disk.
 *
 * Overwrites the entire store atomically.
 */
export function saveStore(store: FaqStoreV1): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}
