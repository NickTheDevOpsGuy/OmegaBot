// src/services/github/prFormatter.ts

import type { GitHubPrSummary } from "./types.js";

/**
 * PR formatting helpers for Discord output.
 *
 * Design goals:
 * - Keep output readable in a busy channel
 * - Use only fields we already have in the PR summary
 * - Make it easy to swap formatting later without touching poller logic
 */

/**
 * 2-line PR output (readable, compact):
 * Line 1: "#123 Title (by author)"
 * Line 2: URL
 */
export function formatPullRequest(pr: GitHubPrSummary): string {
  const author = pr.user?.login ?? "unknown";

  return [`#${pr.number} ${pr.title} (by ${author})`, pr.html_url].join("\n");
}
