import { GitHubApiError } from "./githubClient.js";

export function getGitHubUserMessage(err: unknown): string | null {
  if (!(err instanceof GitHubApiError)) return null;

  switch (err.status) {
    case 404:
      return "I could not find that PR. Double check the number and repo.";
    case 401:
    case 403:
      return "I cannot access that repo with the current GitHub token. Check token and repo permissions.";
    case 429:
      return "GitHub rate limited me. Try again in a bit.";
    default:
      return null;
  }
}
