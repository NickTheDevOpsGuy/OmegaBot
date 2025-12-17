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

export type ListIssuesOptions = {
  state?: "open" | "closed" | "all";
  limit?: number;
  labels?: string[];
};

function listIssuesPath(
  owner: string,
  repo: string,
  options?: ListIssuesOptions,
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

export type ListPrOptions = {
  state?: "open" | "closed" | "all";
  limit?: number;
};

function listPullRequestsPath(
  owner: string,
  repo: string,
  options?: ListPrOptions,
): string {
  const params = new URLSearchParams();
  params.set("state", options?.state ?? "open");
  params.set("per_page", String(options?.limit ?? 20));

  // For pulls: GitHub supports sort=updated
  params.set("sort", "updated");
  params.set("direction", "desc");

  return `${repoBase(owner, repo)}/pulls?${params.toString()}`;
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
/* Single item fetchers                                                */
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
 *
 * Note:
 * GitHub's /issues endpoint can include PRs.
 * PRs contain `pull_request` marker. We filter those out here.
 */
export async function listIssues(
  owner: string,
  repo: string,
  options?: ListIssuesOptions,
): Promise<GitHubIssueSummary[]> {
  const data = await githubRequest<GitHubIssue[]>(listIssuesPath(owner, repo, options));

  return data
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      html_url: i.html_url,
      state: i.state,
      user: { login: i.user.login },
      comments: i.comments,
    }));
}

/**
 * List pull requests (summary view)
 *
 * This is what the poller should consume because it includes:
 * - number, title, url, author
 * - updated_at for last-seen comparisons
 */
export async function listPullRequests(
  owner: string,
  repo: string,
  options?: ListPrOptions,
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
    updated_at: pr.updated_at,
    user: { login: pr.user.login },
    comments: pr.comments,
    review_comments: pr.review_comments,
  }));
}
