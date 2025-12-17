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
/* Shared base types                                                   */
/* ------------------------------------------------------------------ */

export type GitHubUser = {
  login: string;
  html_url: string;
};

export type GitHubLabel = {
  name: string;
  color: string;
};

/* ------------------------------------------------------------------ */
/* Full GitHub API response types                                      */
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

export type GitHubRepo = {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
};

/* ------------------------------------------------------------------ */
/* Command-friendly / normalized response types                        */
/* ------------------------------------------------------------------ */

export type GitHubIssueSummary = {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  user?: { login: string };
  comments?: number;
};

/**
 * PR summary used by commands and the poller.
 *
 * Important:
 * - includes `updated_at` so we can do "last seen" comparisons
 */
export type GitHubPrSummary = {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  merged_at: string | null;
  updated_at: string;
  user?: { login: string };
  comments?: number;
  review_comments?: number;
};