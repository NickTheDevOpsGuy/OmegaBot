// src/services/github/githubApi.ts
// THIS FILE HAS BEEN UPDATED WITH AUTOMATIC CACHING (5-minute TTL)

import { githubRequest, GitHubApiError } from "./githubClient.js";
import { cachedGitHubRequest } from "./githubCache.js";
import { logger } from "../../../utils/logger.js";
import type {
  GitHubIssue,
  GitHubPullRequest,
  GitHubIssueSummary,
  GitHubPrSummary,
} from "./shared/types.js";

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
/* Single item fetchers - WITH CACHING                                */
/* ------------------------------------------------------------------ */

/**
 * Fetch a single issue by number.
 * CACHED: 5 minutes
 */
export function getIssue(
  owner: string,
  repo: string,
  number: number,
): Promise<GitHubIssue> {
  const cacheKey = `issue:${owner}/${repo}/${number}`;

  return cachedGitHubRequest(cacheKey, async () => {
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
  });
}

/**
 * Fetch a single pull request by number.
 * CACHED: 5 minutes
 */
export function getPullRequest(
  owner: string,
  repo: string,
  number: number,
): Promise<GitHubPullRequest> {
  const cacheKey = `pr:${owner}/${repo}/${number}`;

  return cachedGitHubRequest(cacheKey, async () => {
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
  });
}

/**
 * Try PR first, fallback to issue if PR endpoint returns 404.
 * CACHED: Individual lookups are cached
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
/* List helpers - WITH CACHING                                         */
/* ------------------------------------------------------------------ */

/**
 * List issues (issues-only; PRs filtered out)
 * CACHED: 5 minutes
 */
export function listIssues(
  owner: string,
  repo: string,
  options?: ListIssuesOptions,
): Promise<GitHubIssueSummary[]> {
  const state = options?.state ?? "open";
  const limit = options?.limit ?? 30;
  const labels = options?.labels?.join(",") ?? "";
  const cacheKey = `issues:${owner}/${repo}:${state}:${limit}:${labels}`;

  return cachedGitHubRequest(cacheKey, async () => {
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
  });
}

/**
 * List pull requests (summary view)
 * CACHED: 5 minutes
 */
export function listPullRequests(
  owner: string,
  repo: string,
  options?: ListPrOptions,
): Promise<GitHubPrSummary[]> {
  const state = options?.state ?? "open";
  const limit = options?.limit ?? 20;
  const cacheKey = `prs:${owner}/${repo}:${state}:${limit}`;

  return cachedGitHubRequest(cacheKey, async () => {
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
  });
}
