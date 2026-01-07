// src/services/github/issueAssigneePoller.ts

import type { Client } from "discord.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

type PollArgs = {
  client: Client;
  owner: string;
  repo: string;
  announceChannelId: string;
};

type GitHubAssignee = { login: string };

type GitHubIssueItem = {
  number: number;
  title: string;
  html_url: string;
  assignees?: GitHubAssignee[];
  // Present on PRs returned in the issues list
  pull_request?: unknown;
};

type TrackedItem = {
  kind: "PR" | "Issue";
  title: string;
  url: string;
  assignees: string[];
};

type StateFile = {
  /**
   * Back-compat:
   * Older state files might only have assigneesByNumber.
   * We’ll load them and upgrade in-memory automatically.
   */
  assigneesByNumber?: Record<string, string[]>;
  itemsByNumber?: Record<string, TrackedItem>;
  initializedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA_DIR, "github-assignees.json");

function uniqSorted(list: string[]): string[] {
  return Array.from(new Set(list.map((s) => s.trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  );
}

function diff(prev: string[], next: string[]) {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);

  const added = next.filter((x) => !prevSet.has(x));
  const removed = prev.filter((x) => !nextSet.has(x));

  return { added, removed, changed: added.length > 0 || removed.length > 0 };
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadState(): Promise<StateFile | null> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StateFile;
    if (!parsed || typeof parsed !== "object") return null;

    // We accept either the old shape (assigneesByNumber) or new shape (itemsByNumber)
    const hasOld =
      !!parsed.assigneesByNumber && typeof parsed.assigneesByNumber === "object";
    const hasNew = !!parsed.itemsByNumber && typeof parsed.itemsByNumber === "object";

    if (!hasOld && !hasNew) return null;
    if (!parsed.initializedAt || typeof parsed.initializedAt !== "string") return null;

    return parsed;
  } catch {
    return null;
  }
}

async function saveState(state: StateFile): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

async function getAnnounceChannel(
  client: Client,
  channelId: string,
): Promise<{ send: (content: string) => Promise<unknown> }> {
  const ch = await client.channels.fetch(channelId);

  if (!ch || !ch.isTextBased()) {
    throw new Error(`Announce channel is not a text channel: ${channelId}`);
  }

  // TypeScript guard: not all TextBasedChannel unions guarantee send()
  if (!("send" in ch) || typeof ch.send !== "function") {
    throw new Error(`Announce channel does not support send(): ${channelId}`);
  }

  return ch;
}

async function githubFetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "OmegaBot",
      Authorization: `token ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `GitHub API error: ${res.status} ${res.statusText} (${body.slice(0, 200)})`,
    );
  }

  return (await res.json()) as T;
}

function stateToItems(existing: StateFile): Record<string, TrackedItem> {
  // New format available
  if (existing.itemsByNumber && typeof existing.itemsByNumber === "object") {
    return existing.itemsByNumber;
  }

  // Upgrade old format in-memory (no title/url/kind available)
  const old = existing.assigneesByNumber ?? {};
  const upgraded: Record<string, TrackedItem> = {};
  for (const [num, assignees] of Object.entries(old)) {
    upgraded[num] = {
      kind: "Issue",
      title: "(unknown title)",
      url: "(unknown url)",
      assignees: uniqSorted(assignees ?? []),
    };
  }
  return upgraded;
}

/**
 * Poll open issues (includes PRs) and notify on:
 * - assignee changes (add/remove/replace/multi/unassign)
 * - issues/PRs that are no longer open (closed/merged/etc)
 *
 * Notes:
 * - Baseline-first: first successful run saves state and does NOT notify.
 * - State is persisted to ./data/github-assignees.json
 */
export async function pollIssueAssigneesOnce(args: PollArgs): Promise<void> {
  const { client, owner, repo, announceChannelId } = args;

  let token: string;
  try {
    token = env.requireGithubToken();
  } catch (err) {
    logger.warn({ err }, "[github/assignees] missing GITHUB_TOKEN, skipping");
    return;
  }

  let channel: { send: (content: string) => Promise<unknown> };
  try {
    channel = await getAnnounceChannel(client, announceChannelId);
  } catch (err) {
    logger.error({ err, announceChannelId }, "[github/assignees] bad announce channel");
    return;
  }

  // Load state (or init)
  const existing = (await loadState()) ?? {
    assigneesByNumber: {},
    initializedAt: new Date().toISOString(),
  };

  const existingItemsByNumber = stateToItems(existing);
  const hadExistingState = Object.keys(existingItemsByNumber).length > 0;

  // Fetch open issues (includes PRs)
  const url = `https://api.github.com/repos/${encodeURIComponent(
    owner,
  )}/${encodeURIComponent(repo)}/issues?state=open&per_page=100`;

  let items: GitHubIssueItem[];
  try {
    items = await githubFetchJson<GitHubIssueItem[]>(url, token);
  } catch (err) {
    logger.error({ err, owner, repo }, "[github/assignees] fetch failed");
    return;
  }

  const nextItemsByNumber: Record<string, TrackedItem> = {};
  const notifications: Array<{
    kind: "PR" | "Issue";
    number: number;
    title: string;
    url: string;
    added: string[];
    removed: string[];
  }> = [];

  for (const item of items) {
    const numberKey = String(item.number);

    const kind: "PR" | "Issue" = item.pull_request ? "PR" : "Issue";
    const nextAssignees = uniqSorted((item.assignees ?? []).map((a) => a.login));

    nextItemsByNumber[numberKey] = {
      kind,
      title: item.title,
      url: item.html_url,
      assignees: nextAssignees,
    };

    const prevAssignees = uniqSorted(existingItemsByNumber[numberKey]?.assignees ?? []);
    const { added, removed, changed } = diff(prevAssignees, nextAssignees);

    if (hadExistingState && changed) {
      notifications.push({
        kind,
        number: item.number,
        title: item.title,
        url: item.html_url,
        added,
        removed,
      });
    }
  }

  // Detect items that were previously open but are no longer open
  const closedNotifications: Array<{
    kind: "PR" | "Issue";
    number: number;
    title: string;
    url: string;
  }> = [];

  if (hadExistingState) {
    const prevNumbers = new Set(Object.keys(existingItemsByNumber));
    const nextNumbers = new Set(Object.keys(nextItemsByNumber));

    for (const num of prevNumbers) {
      if (!nextNumbers.has(num)) {
        const prev = existingItemsByNumber[num];
        closedNotifications.push({
          kind: prev?.kind ?? "Issue",
          number: Number(num),
          title: prev?.title ?? "(unknown title)",
          url: prev?.url ?? "(unknown url)",
        });
      }
    }
  }

  // Save next state (drops closed issues automatically)
  const nextState: StateFile = {
    itemsByNumber: nextItemsByNumber,
    initializedAt: existing.initializedAt ?? new Date().toISOString(),
  };

  try {
    await saveState(nextState);
  } catch (err) {
    logger.error({ err }, "[github/assignees] failed to save state");
  }

  // Baseline-first: no notifications on first successful run
  if (!hadExistingState) {
    logger.info(
      { owner, repo, trackedCount: Object.keys(nextItemsByNumber).length },
      "[github/assignees] baseline saved (no notifications on first run)",
    );
    return;
  }

  // Announce assignee changes
  for (const n of notifications) {
    const parts: string[] = [];
    parts.push(`**${n.kind} #${n.number}** assignees updated`);
    parts.push(n.title);
    parts.push(n.url);

    if (n.added.length) {
      parts.push(`Added: ${n.added.map((u) => `\`${u}\``).join(", ")}`);
    }
    if (n.removed.length) {
      parts.push(`Removed: ${n.removed.map((u) => `\`${u}\``).join(", ")}`);
    }

    try {
      await channel.send(parts.join("\n"));
      logger.info(
        { number: n.number, kind: n.kind, added: n.added, removed: n.removed },
        "[github/assignees] announced",
      );
    } catch (err) {
      logger.error({ err, number: n.number }, "[github/assignees] failed to announce");
    }
  }

  // Announce closures (issues + PRs)
  for (const c of closedNotifications) {
    const parts: string[] = [];
    parts.push(`**${c.kind} #${c.number}** is no longer open`);
    parts.push(c.title);
    parts.push(c.url);
    parts.push("(Closed/merged/etc — detected via polling)");

    try {
      await channel.send(parts.join("\n"));
      logger.info(
        { number: c.number, kind: c.kind },
        "[github/assignees] closure announced",
      );
    } catch (err) {
      logger.error(
        { err, number: c.number },
        "[github/assignees] failed to announce closure",
      );
    }
  }
}