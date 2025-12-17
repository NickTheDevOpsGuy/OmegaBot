//src/services/timezone/timezoneStore.ts
import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger.js";

type TimezoneStore = Record<string, string>;

/**
 * Store file lives inside the repo folder when running locally.
 * If you deploy later, you will likely want to switch this to a real DB or KV store.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "timezones.json");

function ensureStoreFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify({}, null, 2), "utf8");
      logger.info("Created timezone store file");
    }
  } catch (err) {
    logger.error({ err }, "Failed to initialize timezone store");
    throw err;
  }
}

function loadStore(): TimezoneStore {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (parsed && typeof parsed === "object") {
      return parsed as TimezoneStore;
    }

    logger.warn("Timezone store contained invalid data shape, resetting");
    return {};
  } catch (err) {
    logger.error({ err }, "Failed to load timezone store, using empty fallback");
    return {};
  }
}

function saveStore(store: TimezoneStore): void {
  ensureStoreFile();

  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Failed to save timezone store");
    throw err;
  }
}

/**
 * Validate an IANA timezone string (ex: "America/New_York").
 * We do not guess. If it is invalid, throw.
 */
export function assertValidTimeZone(tz: string): void {
  // Intl throws RangeError for invalid timeZone
  new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
}

/**
 * Return the saved IANA timezone for a user, or null if not set.
 */
export function getUserTimezone(userId: string): string | null {
  const store = loadStore();
  return store[userId] ?? null;
}

/**
 * Save the user's IANA timezone.
 */
export function setUserTimezone(userId: string, tz: string): void {
  assertValidTimeZone(tz);

  const store = loadStore();
  store[userId] = tz;

  saveStore(store);

  logger.info({ userId, tz }, "User timezone saved");
}

/**
 * Remove any saved timezone for the user.
 */
export function clearUserTimezone(userId: string): void {
  const store = loadStore();

  if (store[userId] !== undefined) {
    delete store[userId];
    saveStore(store);
    logger.info({ userId }, "User timezone cleared");
  }
}
