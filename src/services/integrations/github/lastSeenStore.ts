// src/services/github/lastSeenStore.ts

/**
 * SQLite-backed persistent store for GitHub announcement state.
 */
import { getDb } from "../../core/database/db.js";

/**
 * Get the last stored timestamp for a repo.
 *
 * Returns:
 * - unix millis number if present
 * - null if the repo has never been seen
 */
export function getLastSeen(owner: string, repo: string): number | null {
  const key = makeRepoKey(owner, repo);
  const row = getDb()
    .prepare(
      `SELECT last_seen_timestamp
       FROM github_last_seen
       WHERE repo_key = ? AND entity_type = 'pr'`,
    )
    .get(key) as { last_seen_timestamp: number } | undefined;

  return row?.last_seen_timestamp ?? null;
}

/**
 * Save the "last seen" timestamp for PR announcements.
 *
 * We store unix millis (Number) to make comparisons cheap and timezone-agnostic.
 *
 * @param updatedAtIso ISO timestamp string from GitHub API (ex: pr.updated_at)
 */
export function setLastSeenPr(owner: string, repo: string, updatedAtIso: string): void {
  const key = makeRepoKey(owner, repo);

  const ms = Date.parse(updatedAtIso);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid updatedAt timestamp: ${updatedAtIso}`);
  }

  getDb()
    .prepare(
      `INSERT INTO github_last_seen (repo_key, last_seen_timestamp, entity_type)
       VALUES (?, ?, 'pr')
       ON CONFLICT(repo_key) DO UPDATE SET
        last_seen_timestamp = excluded.last_seen_timestamp,
        entity_type = excluded.entity_type`,
    )
    .run(key, ms);
}

/**
 * Remove any stored "last seen" value for a repo.
 *
 * Safe to call even if the repo was never stored.
 * Useful for development resets and testing.
 */
export function clearLastSeen(owner: string, repo: string): void {
  const key = makeRepoKey(owner, repo);
  getDb()
    .prepare(`DELETE FROM github_last_seen WHERE repo_key = ? AND entity_type = 'pr'`)
    .run(key);
}

/**
 * Build a stable storage key for a repo.
 *
 * We intentionally normalize on "owner/repo" because:
 * - It is human-readable
 * - Matches GitHub's canonical naming
 * - Avoids nested JSON structures
 */
function makeRepoKey(owner: string, repo: string): string {
  return `${owner}/${repo}`;
}
