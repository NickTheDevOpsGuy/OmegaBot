// src/services/github/githubClient.ts

import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { githubCircuit } from "../circuitBreaker/breakers.js";

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
 * - Validate auth is configured (only when GitHub features are invoked)
 * - Add auth headers
 * - Perform fetch
 * - Handle non-OK responses
 * - Return typed JSON
 *
 * Higher-level logic (issues, PRs, fallback behavior) lives in githubApi.ts.
 *
 * Note:
 * This function SHOULD NOT be called at startup unless GitHub features are enabled.
 * The bot must be able to run without GitHub tokens/config.
 */
export async function githubRequest<T>(path: string): Promise<T> {
  return githubCircuit.execute(async () => {
    const url = `${GITHUB_API_BASE}${path}`;

    // Enforce token only when a GitHub code path is actually executed.
    const token = env.requireGithubToken();

    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
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

      logger.warn(
        { status: res.status, url, path, message },
        "GitHub API request failed",
      );

      throw new GitHubApiError(message, res.status, url);
    }

    return (await res.json()) as T;
  });
}
