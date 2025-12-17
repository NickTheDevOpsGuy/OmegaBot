// src/services/github/prPoller.ts

import type { Client, TextBasedChannel } from "discord.js";
import { listPullRequests } from "./githubApi.js";
import { getLastSeen, setLastSeenPr } from "./lastSeenStore.js";
import { formatPullRequest } from "./prFormatter.js";

/**
 * Minimal shape we need from the GitHub PR list for polling announcements.
 * Your githubApi.listPullRequests MUST return objects that include `updated_at`.
 */
type PrForPolling = {
  updated_at: string; // ISO timestamp from GitHub
};

/**
 * Poll GitHub for new or updated PRs and announce them in a Discord channel.
 *
 * Policy:
 * - We track "last seen" using PR.updated_at
 * - We announce PRs where updated_at is newer than last seen
 * - After announcing, we update last seen to the newest updated_at we announced
 */
export async function pollPullRequestsOnce(args: {
  client: Client;
  owner: string;
  repo: string;
  announceChannelId: string;
  limit?: number;
}): Promise<void> {
  const { client, owner, repo, announceChannelId, limit = 20 } = args;

  // Pull newest-updated first (based on your githubApi query params).
  const prs = (await listPullRequests(owner, repo, {
    state: "open",
    limit,
  })) as unknown as (PrForPolling & Parameters<typeof formatPullRequest>[0])[];

  if (prs.length === 0) return;

  const lastSeen = getLastSeen(owner, repo) ?? 0;

  // Keep only PRs updated after our stored last-seen timestamp.
  const fresh = prs.filter((pr) => {
    const ms = Date.parse(pr.updated_at);
    return !Number.isNaN(ms) && ms > lastSeen;
  });

  if (fresh.length === 0) return;

  // Fetch the announce channel and safely narrow it to something we can `.send()` to.
  const fetched = await client.channels.fetch(announceChannelId);
  if (!fetched || !fetched.isTextBased()) return;

  // Post oldest-first so announcements read naturally.
  const oldestFirst = [...fresh].sort(
    (a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at),
  );

// Extra TS guard: only proceed if this thing actually has a send() function.
if (!("send" in fetched) || typeof fetched.send !== "function") return;

for (const pr of oldestFirst) {
  await fetched.send(formatPullRequest(pr));
}

  // Update last-seen to the newest updated_at we just announced.
  const newest = oldestFirst[oldestFirst.length - 1];
  setLastSeenPr(owner, repo, newest.updated_at);
}