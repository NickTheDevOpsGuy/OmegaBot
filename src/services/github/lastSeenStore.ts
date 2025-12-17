import fs from "fs";
import path from "path";

/**
 * Absolute path to the persistent store for GitHub announcement state.
 *
 * This file is intentionally:
 * - JSON (human-readable, debuggable)
 * - Stored outside src/ so it survives rebuilds
 *
 * Example contents:
 * {
 *   "owner/repo": 1713291823000
 * }
 */
const STORE_PATH = path.join(process.cwd(), "data", "last-seen.json");

type Store = Record<string, number>;

/**
 * Get the last stored timestamp for a repo.
 *
 * Returns:
 * - unix millis number if present
 * - null if the repo has never been seen
 */
export function getLastSeen(owner: string, repo: string): number | null {
  const store = loadStore();
  const key = makeRepoKey(owner, repo);
  return key in store ? store[key] : null;
}

/**
 * Save the "last seen" timestamp for PR announcements.
 *
 * We store unix millis (Number) to make comparisons cheap and timezone-agnostic.
 */
export function setLastSeenPr(owner: string, repo: string, updatedAtIso: string): void {
  const store = loadStore();
  const key = makeRepoKey(owner, repo);

  const ms = Date.parse(updatedAtIso);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid updatedAt timestamp: ${updatedAtIso}`);
  }

  store[key] = ms;
  saveStore(store);
}

/**
 * Remove any stored "last seen" value for a repo.
 * Safe even if key does not exist.
 */
export function clearLastSeen(owner: string, repo: string): void {
  const store = loadStore();
  const key = makeRepoKey(owner, repo);

  if (key in store) {
    delete store[key];
    saveStore(store);
  }
}

function makeRepoKey(owner: string, repo: string): string {
  return `${owner}/${repo}`;
}

function loadStore(): Store {
  if (!fs.existsSync(STORE_PATH)) {
    return {};
  }

  const raw = fs.readFileSync(STORE_PATH, "utf8");
  try {
    return JSON.parse(raw) as Store;
  } catch {
    // If the JSON is corrupted, fail safe to empty.
    return {};
  }
}

function saveStore(store: Store): void {
  const dir = path.dirname(STORE_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}