import dotenv from "dotenv";
dotenv.config();

/**
 * Helper to enforce that required environment variables are present.
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
 * Required fields:
 *  - DISCORD_TOKEN     Bot authentication token for connecting to Discord.
 *  - DISCORD_APP_ID    Application ID needed for command registration.
 *  - DISCORD_GUILD_ID  Guild where development commands are registered.
 *
 * Optional fields:
 *  - SUMMARY_MODE      "local" (default) or "llm"
 *                      Determines which summarizer implementation is used.
 *  - OPENAI_API_KEY    Only required when using LLM summary mode.
 *
 * Keeping this configuration in one place prevents scattered env lookups
 * and makes the bot easier to configure, test, and deploy.
 */
export const env = {
  token: requireEnv("DISCORD_TOKEN"),
  appId: requireEnv("DISCORD_APP_ID"),
  guildId: requireEnv("DISCORD_GUILD_ID"),

  // Summary mode defaults to local so the bot can run without AI keys.
  summaryMode: process.env.SUMMARY_MODE ?? "local",

  // Optional, only needed when user chooses LLM summarization.
  openAIKey: process.env.OPENAI_API_KEY ?? null,

  // GitHub
  githubToken: process.env.GITHUB_TOKEN ?? null,
};
