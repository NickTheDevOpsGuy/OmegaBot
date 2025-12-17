// src/services/github/prPoller.ts

import type { Client } from "discord.js";
import { listPullRequests } from "./githubApi.js";
import { getLastSeen, setLastSeenPr } from "./lastSeenStore.js";
import { formatPullRequest } from "./prFormatter.js";
import { logger } from "../../utils/logger.js";

/**
 * Minimal shape we need from the GitHub PR list for polling announcements.
 * githubApi.listPullRequests must return objects with `updated_at`.
 */
type PrForPolling = {
  updated_at: string;
};

/**
 * Poll GitHub for new or updated PRs and announce them in a Discord channel.
 *
 * Design goals:
 * - Never throw (background job safety)
 * - Log failures once with context
 * - Skip quietly when nothing to do
 */
export async function pollPullRequestsOnce(args: {
  client: Client;
  owner: string;
  repo: string;
  announceChannelId: string;
  limit?: number;
}): Promise<void> {
  const { client, owner, repo, announceChannelId, limit = 20 } = args;

  try {
    // Pull newest-updated first (based on githubApi query params)
    const prs = (await listPullRequests(owner, repo, {
      state: "open",
      limit,
    })) as unknown as (PrForPolling & Parameters<typeof formatPullRequest>[0])[];

    if (prs.length === 0) return;

    const lastSeen = getLastSeen(owner, repo) ?? 0;

    // Keep only PRs updated after our stored timestamp
    const fresh = prs.filter((pr) => {
      const ms = Date.parse(pr.updated_at);
      return !Number.isNaN(ms) && ms > lastSeen;
    });

    if (fresh.length === 0) return;

    const fetched = await client.channels.fetch(announceChannelId);
    if (!fetched || !fetched.isTextBased()) {
      logger.warn(
        { announceChannelId },
        "PR poller could not resolve announce channel",
      );
      return;
    }

    // Extra runtime guard
    if (!("send" in fetched) || typeof fetched.send !== "function") return;

    // Post oldest-first so announcements read naturally
    const oldestFirst = [...fresh].sort(
      (a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at),
    );

    for (const pr of oldestFirst) {
      await fetched.send(formatPullRequest(pr));
    }

    // Update last-seen to newest PR we announced
    const newest = oldestFirst[oldestFirst.length - 1];
    setLastSeenPr(owner, repo, newest.updated_at);
  } catch (err) {
    logger.error(
      { err, owner, repo, announceChannelId },
      "GitHub PR polling failed",
    );
  }
}