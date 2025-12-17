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
 *      Required for:
 *        - Issue lookup
 *        - PR lookup
 *        - PR announcements
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
 * All GitHub announcement fields are optional so the bot can run
 * without polling enabled.
 */
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
  summaryMode: process.env.SUMMARY_MODE ?? "local",

  // Only required when summaryMode === "llm"
  openAIKey: process.env.OPENAI_API_KEY ?? null,

  /* ---------------------------------------------------------------- */
  /* GitHub                                                          */
  /* ---------------------------------------------------------------- */

  // Auth token for GitHub REST API
  githubToken: process.env.GITHUB_TOKEN ?? null,

  // Default repo configuration for PR polling (optional)
  githubOwner: process.env.GITHUB_OWNER ?? null,
  githubRepo: process.env.GITHUB_REPO ?? null,

  // Where PR announcements should be posted
  githubAnnounceChannelId: process.env.GITHUB_ANNOUNCE_CHANNEL_ID ?? null,

  // Polling interval (ms). Defaults to 60s.
  githubPollIntervalMs: Number(process.env.GITHUB_POLL_INTERVAL_MS ?? "60000"),
};