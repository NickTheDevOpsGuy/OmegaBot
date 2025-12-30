import dotenv from "dotenv";
dotenv.config();

/**
 * Helper to enforce that required environment variables are present.
 *
 * If a variable is missing, the bot fails fast at startup instead of
 * crashing later at runtime in unpredictable ways.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment`);
  }
  return value;
}

/**
 * Parse an integer env var safely.
 * Falls back to `defaultValue` if missing/invalid.
 */
function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;

  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return defaultValue;
  if (n <= 0) return defaultValue;

  return n;
}

type SummaryMode = "local" | "llm";

/**
 * Centralized environment configuration for OmegaBot.
 *
 * Keeping this configuration in one place:
 * - Prevents scattered process.env lookups
 * - Makes configuration explicit and auditable
 * - Allows optional features to be gated cleanly
 *
 * ------------------------------------------------------------------
 * Required (core bot functionality)
 * ------------------------------------------------------------------
 *
 *  - DISCORD_TOKEN
 *      Bot authentication token used to connect to Discord.
 *
 *  - DISCORD_APP_ID
 *      Application ID required for slash command registration.
 *
 *  - DISCORD_GUILD_ID
 *      Guild where development commands are registered.
 *
 * ------------------------------------------------------------------
 * Optional (feature flags / enhancements)
 * ------------------------------------------------------------------
 *
 *  - SUMMARY_MODE
 *      "local" (default) or "llm"
 *      Determines which summarizer implementation is used.
 *
 *  - OPENAI_API_KEY
 *      Required only when SUMMARY_MODE === "llm".
 *
 * ------------------------------------------------------------------
 * GitHub integration
 * ------------------------------------------------------------------
 *
 *  - GITHUB_TOKEN
 *      Personal Access Token used for authenticated GitHub REST calls.
 *      Required only when GitHub-backed features are enabled.
 *
 *  - GITHUB_OWNER
 *      Default repository owner for polling PRs (optional).
 *
 *  - GITHUB_REPO
 *      Default repository name for polling PRs (optional).
 *
 *  - GITHUB_ANNOUNCE_CHANNEL_ID
 *      Discord channel ID where PR announcements are posted (optional).
 *
 *  - GITHUB_POLL_INTERVAL_MS
 *      Polling interval for PR announcements.
 *      Defaults to 60 seconds if not provided.
 *
 * All GitHub-related fields are OPTIONAL so the bot can run
 * without any GitHub configuration or tokens.
 */
const summaryMode = (process.env.SUMMARY_MODE ?? "local") as SummaryMode;

// Fail fast ONLY when LLM summaries are explicitly enabled
if (summaryMode === "llm" && !process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required when SUMMARY_MODE=llm");
}

export const env = {
  /* ---------------------------------------------------------------- */
  /* Discord (required)                                               */
  /* ---------------------------------------------------------------- */

  token: requireEnv("DISCORD_TOKEN"),
  appId: requireEnv("DISCORD_APP_ID"),
  guildId: requireEnv("DISCORD_GUILD_ID"),

  /* ---------------------------------------------------------------- */
  /* Summaries                                                        */
  /* ---------------------------------------------------------------- */

  // Defaults to local so the bot runs without AI keys.
  summaryMode,

  // Only required when summaryMode === "llm"
  openAIKey: process.env.OPENAI_API_KEY ?? null,

  /* ---------------------------------------------------------------- */
  /* GitHub                                                           */
  /* ---------------------------------------------------------------- */

  // Auth token for GitHub REST API (optional)
  githubToken: process.env.GITHUB_TOKEN ?? null,

  // Default repo configuration for PR polling (optional)
  githubOwner: process.env.GITHUB_OWNER ?? null,
  githubRepo: process.env.GITHUB_REPO ?? null,

  // Where PR announcements should be posted (optional)
  githubAnnounceChannelId: process.env.GITHUB_ANNOUNCE_CHANNEL_ID ?? null,

  // Polling interval (ms). Defaults to 60s.
  githubPollIntervalMs: envInt("GITHUB_POLL_INTERVAL_MS", 60_000),

  /**
   * Feature gate:
   *
   * GitHub announcement polling is enabled ONLY when all required
   * configuration is present. This prevents the bot from attempting
   * GitHub API calls (or requiring tokens) at startup.
   */
  githubAnnouncementsEnabled:
    Boolean(process.env.GITHUB_TOKEN) &&
    Boolean(process.env.GITHUB_OWNER) &&
    Boolean(process.env.GITHUB_REPO) &&
    Boolean(process.env.GITHUB_ANNOUNCE_CHANNEL_ID),

  /**
   * Helper for GitHub-only code paths.
   *
   * Call this ONLY inside GitHub feature implementations
   * (commands, pollers, handlers).
   *
   * This ensures:
   * - The bot can start without GitHub config
   * - GitHub features fail loudly and clearly when misconfigured
   */
  requireGithubToken(): string {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is required for this GitHub feature");
    }
    return token;
  },
};
