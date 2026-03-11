// src/services/faq/store.ts

import fs from "fs";
import path from "path";
import { z } from "zod";
import { logger } from "../../../utils/logger.js";
import type { FaqStoreV1 } from "./types.js";

const FaqEntrySchema = z.object({
  key: z.string(),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  updatedBy: z.string(),
  usageCount: z.number(),
});

const FaqStoreV1Schema = z.object({
  version: z.literal(1),
  entries: z.record(z.string(), FaqEntrySchema),
});

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
    const json = JSON.parse(raw) as unknown;
    const result = FaqStoreV1Schema.safeParse(json);
    if (result.success) return result.data;
    logger.warn(
      { err: result.error.flatten(), path: STORE_PATH },
      "[faq] store validation failed, falling back to empty store",
    );
    return { version: 1, entries: {} };
  } catch (err) {
    logger.error({ err }, "[faq] load store threw, falling back to empty store");
    return { version: 1, entries: {} };
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
