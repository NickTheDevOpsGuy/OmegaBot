// src/services/github/githubApi.ts

import { githubRequest, GitHubApiError } from "./githubClient.js";
import { logger } from "../../utils/logger.js";
import type {
  GitHubIssue,
  GitHubPullRequest,
  GitHubIssueSummary,
  GitHubPrSummary,
} from "./types.js";

/* ------------------------------------------------------------------ */
/* Path helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Build the base repo API path.
 */
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

  // GitHub default is "open", but keep explicit if the caller sets it.
  if (options?.state) params.set("state", options.state);

  // GitHub uses per_page for page size.
  if (options?.limit) params.set("per_page", String(options.limit));

  // Comma-separated labels.
  if (options?.labels?.length) params.set("labels", options.labels.join(","));

  // Default sorting: most recently updated first.
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

/**
 * Narrow unknown errors into a GitHubApiError with status info.
 * This lets callers do 404 fallback safely.
 */
function isGitHubApiError(err: unknown): err is GitHubApiError {
  return err instanceof GitHubApiError;
}

function is404(err: unknown): err is GitHubApiError {
  return isGitHubApiError(err) && err.status === 404;
}

/* ------------------------------------------------------------------ */
/* Single item fetchers                                                */
/* ------------------------------------------------------------------ */

/**
 * Fetch a single issue by number.
 */
export async function getIssue(
  owner: string,
  repo: string,
  number: number,
): Promise<GitHubIssue> {
  try {
    return await githubRequest<GitHubIssue>(issuePath(owner, repo, number));
  } catch (err) {
    if (isGitHubApiError(err)) {
      logger.warn(
        { owner, repo, number, status: err.status, url: err.url },
        "getIssue failed",
      );
    } else {
      logger.error({ err, owner, repo, number }, "getIssue threw");
    }
    throw err;
  }
}

/**
 * Fetch a single pull request by number.
 */
export async function getPullRequest(
  owner: string,
  repo: string,
  number: number,
): Promise<GitHubPullRequest> {
  try {
    return await githubRequest<GitHubPullRequest>(prPath(owner, repo, number));
  } catch (err) {
    if (isGitHubApiError(err)) {
      logger.warn(
        { owner, repo, number, status: err.status, url: err.url },
        "getPullRequest failed",
      );
    } else {
      logger.error({ err, owner, repo, number }, "getPullRequest threw");
    }
    throw err;
  }
}

/**
 * Try PR first, fallback to issue if PR endpoint returns 404.
 */
export async function getIssueOrPr(
  owner: string,
  repo: string,
  number: number,
): Promise<GitHubIssue | GitHubPullRequest> {
  try {
    return await getPullRequest(owner, repo, number);
  } catch (err) {
    if (is404(err)) {
      return await getIssue(owner, repo, number);
    }
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
  try {
    const data = await githubRequest<GitHubIssue[]>(
      listIssuesPath(owner, repo, options),
    );

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
  } catch (err) {
    if (isGitHubApiError(err)) {
      logger.warn(
        { owner, repo, status: err.status, url: err.url, options },
        "listIssues failed",
      );
    } else {
      logger.error({ err, owner, repo, options }, "listIssues threw");
    }
    throw err;
  }
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
  try {
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
  } catch (err) {
    if (isGitHubApiError(err)) {
      logger.warn(
        { owner, repo, status: err.status, url: err.url, options },
        "listPullRequests failed",
      );
    } else {
      logger.error({ err, owner, repo, options }, "listPullRequests threw");
    }
    throw err;
  }
}