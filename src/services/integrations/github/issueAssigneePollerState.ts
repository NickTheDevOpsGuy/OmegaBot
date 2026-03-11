// src/services/github/issueAssigneePollerState.ts
// Persists GitHub issue/PR assignee tracking state in SQLite.

import { getDb } from "../../core/database/db.js";

export type TrackedItem = {
  kind: "PR" | "Issue";
  title: string;
  url: string;
  assignees: string[];
};

export type RepoState = {
  initializedAt: string;
  itemsByNumber: Record<string, TrackedItem>;
};

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export function loadGithubAssigneeState(owner: string, repo: string): RepoState {
  const db = getDb();

  const meta = db
    .prepare(
      `SELECT initialized_at
       FROM github_assignees_meta
       WHERE owner = ? AND repo = ?`,
    )
    .get(owner, repo) as { initialized_at?: string } | undefined;

  const initializedAt = meta?.initialized_at ?? nowIso();

  const rows = db
    .prepare(
      `SELECT number, kind, title, url, assignees_json
       FROM github_assignees_state
       WHERE owner = ? AND repo = ?`,
    )
    .all(owner, repo) as Array<{
    number: number;
    kind: "PR" | "Issue";
    title: string;
    url: string;
    assignees_json: string | null;
  }>;

  const itemsByNumber: Record<string, TrackedItem> = {};
  for (const r of rows) {
    itemsByNumber[String(r.number)] = {
      kind: r.kind,
      title: r.title,
      url: r.url,
      assignees: safeJsonParse<string[]>(r.assignees_json, []),
    };
  }

  return { initializedAt, itemsByNumber };
}

export function saveGithubAssigneeState(
  owner: string,
  repo: string,
  state: RepoState,
): void {
  const db = getDb();

  const tx = db.transaction(() => {
    // Ensure meta row exists
    db.prepare(
      `INSERT INTO github_assignees_meta (owner, repo, initialized_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(owner, repo) DO UPDATE SET updated_at = excluded.updated_at`,
    ).run(owner, repo, state.initializedAt, nowIso());

    // Replace all rows for this repo (simple + safe baseline overwrite)
    db.prepare(`DELETE FROM github_assignees_state WHERE owner = ? AND repo = ?`).run(
      owner,
      repo,
    );

    const insert = db.prepare(
      `INSERT INTO github_assignees_state
         (owner, repo, number, kind, title, url, assignees_json, updated_at)
       VALUES
         (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const [num, item] of Object.entries(state.itemsByNumber)) {
      insert.run(
        owner,
        repo,
        Number(num),
        item.kind,
        item.title,
        item.url,
        JSON.stringify(item.assignees ?? []),
        nowIso(),
      );
    }
  });

  tx();
}
