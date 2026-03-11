// src/services/github/prFormatter.ts

import type { GitHubPullRequest } from "./shared/types.js";

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Format a single GitHub pull request into a Discord-friendly message.
 *
 * Design goals:
 * - Pure function (no I/O, no Discord client usage)
 * - Safe to reuse in commands and background pollers
 * - Stable output for future diffing / testing
 *
 * IMPORTANT:
 * This file must NOT import itself or re-export via a barrel,
 * otherwise TypeScript will create circular alias errors.
 */

/**
 * Format a pull request announcement message.
 */
export function formatPullRequest(pr: GitHubPullRequest): string {
  const author = pr.user?.login ? ` by @${pr.user.login}` : "";
  const state = pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : "open";

  const updatedAt = pr.updated_at ? ` (updated ${formatTimestamp(pr.updated_at)})` : "";

  return [
    `**PR #${pr.number}** ${pr.title}`,
    `${state}${author}${updatedAt}`,
    pr.html_url,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Internal utilities                                                  */
/* ------------------------------------------------------------------ */

/**
 * Format an ISO timestamp into a short, readable form.
 *
 * We intentionally avoid locale-specific formatting so output
 * is consistent across environments.
 */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toISOString().replace("T", " ").replace("Z", " UTC");
}
