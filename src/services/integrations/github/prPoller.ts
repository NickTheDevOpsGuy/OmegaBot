// src/services/github/prPoller.ts

import type { Client } from "discord.js";
import { listPullRequests } from "./githubApi.js";
import { getLastSeen, setLastSeenPr } from "./lastSeenStore.js";
import { formatPullRequest } from "./prFormatter.js";
import { logger } from "../../../utils/logger.js";

/**
 * Minimal shape we need from the GitHub PR list for polling announcements.
 * githubApi.listPullRequests must return objects with `created_at`.
 */
type PrForPolling = {
  created_at: string;
};

/**
 * Poll GitHub for NEW PRs (created since last seen) and announce them in a Discord channel.
 *
 * Design goals:
 * - Never throw (background job safety)
 * - Log failures once with context
 * - Skip quietly when nothing to do
 * - Baseline-first: first successful run stores lastSeen and does NOT announce
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
    // Pull newest-first (based on githubApi query params)
    // IMPORTANT: We only announce PRs based on created_at (not updated_at)
    const prs = (await listPullRequests(owner, repo, {
      state: "open",
      limit,
    })) as unknown as (PrForPolling & Parameters<typeof formatPullRequest>[0])[];

    if (prs.length === 0) return;

    const lastSeen = getLastSeen(owner, repo) ?? 0;

    // Baseline-first: if we've never seen anything, set marker and do not announce
    if (lastSeen === 0) {
      const newestCreated = prs
        .map((pr) => Date.parse(pr.created_at))
        .filter((ms) => !Number.isNaN(ms))
        .sort((a, b) => b - a)[0];

      if (newestCreated && newestCreated > 0) {
        // Store the timestamp as an ISO string via setLastSeenPr
        setLastSeenPr(owner, repo, new Date(newestCreated).toISOString());
        logger.info({ owner, repo }, "PR poller baseline saved (no announcements)");
      }

      return;
    }

    // Keep only PRs created after our stored timestamp
    const fresh = prs.filter((pr) => {
      const ms = Date.parse(pr.created_at);
      return !Number.isNaN(ms) && ms > lastSeen;
    });

    if (fresh.length === 0) return;

    const fetched = await client.channels.fetch(announceChannelId);
    if (!fetched || !fetched.isTextBased()) {
      logger.warn({ announceChannelId }, "PR poller could not resolve announce channel");
      return;
    }

    // Extra runtime guard
    if (!("send" in fetched) || typeof fetched.send !== "function") return;

    // Post oldest-first so announcements read naturally
    const oldestFirst = [...fresh].sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
    );

    for (const pr of oldestFirst) {
      await fetched.send(formatPullRequest(pr));
    }

    // Update last-seen to newest PR we announced (by created_at)
    const newest = oldestFirst[oldestFirst.length - 1];
    setLastSeenPr(owner, repo, newest.created_at);
  } catch (err) {
    logger.error({ err, owner, repo, announceChannelId }, "GitHub PR polling failed");
  }
}
