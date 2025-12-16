// src/services/github/githubClient.ts

import { env } from "../../config/env.js";

/**
 * Base URL for GitHub REST API v3
 */
const GITHUB_API_BASE = "https://api.github.com";

/**
 * Error shape thrown when GitHub responds with a non-2xx status.
 * Callers can inspect `status` to decide what to do (ex: 404 fallback).
 */
export class GitHubApiError extends Error {
  status: number;
  url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.url = url;
  }
}

/**
 * Low-level GitHub request helper.
 *
 * Responsibilities:
 * - Add auth headers
 * - Perform fetch
 * - Handle non-OK responses
 * - Return typed JSON
 *
 * Higher-level logic (issues, PRs, fallback behavior) lives in githubApi.ts.
 */
export async function githubRequest<T>(path: string): Promise<T> {
  const url = `${GITHUB_API_BASE}${path}`;

  if (!env.githubToken) {
    throw new Error("GITHUB_TOKEN is not set in environment");
  }

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "OmegaBot",
    },
  });

  if (!res.ok) {
    let message = res.statusText;

    // GitHub usually returns JSON with { message: "...", ... }
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // Ignore parse failures, keep statusText
    }

    throw new GitHubApiError(message, res.status, url);
  }

  return (await res.json()) as T;
}
