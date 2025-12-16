// src/services/github/githubApi.ts

import { githubRequest, GitHubApiError } from "./githubClient.js";
import type {
  GitHubIssue,
  GitHubPullRequest,
  GitHubIssueSummary,
  GitHubPrSummary,
} from "./types.js";

/* ------------------------------------------------------------------ */
/* Path helpers                                                        */
/* ------------------------------------------------------------------ */

function repoBase(owner: string, repo: string): string {
  return `/repos/${owner}/${repo}`;
}

function issuePath(owner: string, repo: string, number: number): string {
  return `${repoBase(owner, repo)}/issues/${number}`;
}

function prPath(owner: string, repo: string, number: number): string {
  return `${repoBase(owner, repo)}/pulls/${number}`;
}

function listIssuesPath(
  owner: string,
  repo: string,
  options?: {
    state?: "open" | "closed" | "all";
    limit?: number;
    labels?: string[];
  },
): string {
  const params = new URLSearchParams();

  if (options?.state) params.set("state", options.state);
  if (options?.limit) params.set("per_page", String(options.limit));
  if (options?.labels?.length) params.set("labels", options.labels.join(","));

  params.set("sort", "updated");
  params.set("direction", "desc");

  const query = params.toString();
  return `${repoBase(owner, repo)}/issues${query ? `?${query}` : ""}`;
}

function listPullRequestsPath(
  owner: string,
  repo: string,
  options?: {
    state?: "open" | "closed" | "all";
    limit?: number;
  },
): string {
  const params = new URLSearchParams();

  if (options?.state) params.set("state", options.state);
  if (options?.limit) params.set("per_page", String(options.limit));

  params.set("sort", "updated");
  params.set("direction", "desc");

  const query = params.toString();
  return `${repoBase(owner, repo)}/pulls${query ? `?${query}` : ""}`;
}

/* ------------------------------------------------------------------ */
/* Error helpers                                                       */
/* ------------------------------------------------------------------ */

function isGitHubApiError(err: unknown): err is GitHubApiError {
  return err instanceof GitHubApiError;
}

function is404(err: unknown): err is GitHubApiError {
  return isGitHubApiError(err) && err.status === 404;
}

/* ------------------------------------------------------------------ */
/* Single-item fetchers                                                */
/* ------------------------------------------------------------------ */

export async function getIssue(
  owner: string,
  repo: string,
  number: number,
): Promise<GitHubIssue> {
  return githubRequest<GitHubIssue>(issuePath(owner, repo, number));
}

export async function getPullRequest(
  owner: string,
  repo: string,
  number: number,
): Promise<GitHubPullRequest> {
  return githubRequest<GitHubPullRequest>(prPath(owner, repo, number));
}

export async function getIssueOrPr(
  owner: string,
  repo: string,
  number: number,
): Promise<GitHubIssue | GitHubPullRequest> {
  try {
    return await getPullRequest(owner, repo, number);
  } catch (err) {
    if (is404(err)) return await getIssue(owner, repo, number);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* List helpers (command-facing)                                       */
/* ------------------------------------------------------------------ */

/**
 * List issues (issues-only; PRs filtered out)
 */
export async function listIssues(
  owner: string,
  repo: string,
  options?: {
    state?: "open" | "closed" | "all";
    limit?: number;
    labels?: string[];
  },
): Promise<GitHubIssueSummary[]> {
  const data = await githubRequest<GitHubIssue[]>(listIssuesPath(owner, repo, options));

  return data
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      html_url: i.html_url,
      state: i.state,
      user: i.user,
      comments: i.comments,
    }));
}

/**
 * List pull requests
 */
export async function listPullRequests(
  owner: string,
  repo: string,
  options?: {
    state?: "open" | "closed" | "all";
    limit?: number;
  },
): Promise<GitHubPrSummary[]> {
  const data = await githubRequest<GitHubPullRequest[]>(
    listPullRequestsPath(owner, repo, options),
  );

  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    html_url: pr.html_url,
    state: pr.state,
    merged_at: pr.merged_at,
    user: pr.user,
    comments: pr.comments,
    review_comments: pr.review_comments,
  }));
}
