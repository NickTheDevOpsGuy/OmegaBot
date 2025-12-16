/**
 * GitHub API Types
 *
 * This file defines the data contracts used by OmegaBot when interacting
 * with the GitHub REST API.
 *
 * Design goals:
 * - Keep types explicit and readable
 * - Separate "full API shapes" from "command-friendly views"
 * - Avoid over-modeling fields we don’t actually use
 */

/* ------------------------------------------------------------------ */
/* Shared base types                                                    */
/* ------------------------------------------------------------------ */

/**
 * GitHub user object
 */
export type GitHubUser = {
  login: string;
  html_url: string;
};

/**
 * GitHub issue/PR label
 */
export type GitHubLabel = {
  name: string;
  color: string;
};

/* ------------------------------------------------------------------ */
/* Full GitHub API response types                                      */
/* These match what the GitHub REST API actually returns               */
/* ------------------------------------------------------------------ */

/**
 * GitHub Issue
 *
 * NOTE:
 * - Pull Requests also appear in the `/issues` API.
 * - When an issue is a PR, it includes a `pull_request` field.
 */
export type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;

  user: GitHubUser;
  labels: GitHubLabel[];

  comments: number;

  created_at: string;
  updated_at: string;
  closed_at: string | null;

  /**
   * Present only if this issue is actually a Pull Request
   * (when fetched from the /issues API)
   */
  pull_request?: {
    html_url: string;
  };
};

/**
 * GitHub Pull Request
 *
 * Returned from the `/pulls` API.
 * Contains additional fields not present on issues.
 */
export type GitHubPullRequest = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;

  user: GitHubUser;

  merged: boolean;
  mergeable: boolean | null;

  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;

  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
};

/**
 * Lightweight repository info
 * Useful for validation, previews, or summaries later
 */
export type GitHubRepo = {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
};

/* ------------------------------------------------------------------ */
/* Command-friendly / normalized response types                         */
/* These are what slash commands should actually consume               */
/* ------------------------------------------------------------------ */

/**
 * Minimal Issue view used by commands
 */
export type GitHubIssueSummary = {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  user?: { login: string };
  comments?: number;
};

/**
 * Minimal PR view used by commands
 */
export type GitHubPrSummary = {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  merged_at: string | null;
  user?: { login: string };
  comments?: number;
  review_comments?: number;
};
