// src/config/env.ts
import { config } from "dotenv";
import { z } from "zod";
import { logger } from "../utils/logger.js";

// Load .env file
config();

/**
 * Environment variable schema with validation and type safety.
 * Uses Zod to validate all required variables on startup.
 */
const envSchema = z.object({
  // Discord (required)
  token: z.string().min(1, "DISCORD_TOKEN is required"),
  clientId: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  
  // Discord (optional)
  guildId: z.string().optional(),
  autoRoleId: z.string().optional(),
  welcomeChannelId: z.string().optional(),

  // GitHub (all optional - features enabled only when all required vars present)
  githubToken: z.string().optional(),
  githubOwner: z.string().optional(),
  githubRepo: z.string().optional(),
  githubPrAnnounceChannelId: z.string().optional(),
  githubAssigneeAnnounceChannelId: z.string().optional(),
  githubPollIntervalMs: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 300000))
    .pipe(z.number().min(60000, "Poll interval must be at least 60 seconds")),

  // OpenAI (optional)
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().default("gpt-4o-mini"),
  openaiMaxTokens: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1000))
    .pipe(z.number().min(100).max(4000)),
  openaiMaxCostPerRequest: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : 0.10))
    .pipe(z.number().min(0)),

  // Claude API (optional)
  claudeApiKey: z.string().optional(),
  claudeModel: z.string().default("claude-sonnet-4-20250514"),
  claudeMaxTokens: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 4096))
    .pipe(z.number().min(100).max(8192)),
  claudeMaxCostPerRequest: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : 0.50))
    .pipe(z.number().min(0)),

  // Weather API (optional)
  weatherApiKey: z.string().optional(),

  // Logging
  logLevel: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // Database
  databasePath: z.string().default("data/omegabot.db"),
});

/**
 * Parse and validate environment variables.
 * Exits the process if validation fails.
 */
function validateEnv() {
  try {
    const parsed = envSchema.parse({
      token: process.env.DISCORD_TOKEN,
      clientId: process.env.DISCORD_CLIENT_ID,
      guildId: process.env.DISCORD_GUILD_ID,
      autoRoleId: process.env.DISCORD_AUTO_ROLE_ID,
      welcomeChannelId: process.env.DISCORD_WELCOME_CHANNEL_ID,
      githubToken: process.env.GITHUB_TOKEN,
      githubOwner: process.env.GITHUB_OWNER,
      githubRepo: process.env.GITHUB_REPO,
      githubPrAnnounceChannelId: process.env.GITHUB_PR_ANNOUNCE_CHANNEL_ID,
      githubAssigneeAnnounceChannelId: process.env.GITHUB_ASSIGNEE_ANNOUNCE_CHANNEL_ID,
      githubPollIntervalMs: process.env.GITHUB_POLL_INTERVAL_MS,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL,
      openaiMaxTokens: process.env.OPENAI_MAX_TOKENS,
      openaiMaxCostPerRequest: process.env.OPENAI_MAX_COST_PER_REQUEST,
      claudeApiKey: process.env.ANTHROPIC_API_KEY,
      claudeModel: process.env.CLAUDE_MODEL,
      claudeMaxTokens: process.env.CLAUDE_MAX_TOKENS,
      claudeMaxCostPerRequest: process.env.CLAUDE_MAX_COST_PER_REQUEST,
      weatherApiKey: process.env.WEATHER_API_KEY,
      logLevel: process.env.LOG_LEVEL,
      databasePath: process.env.DATABASE_PATH,
    });

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.fatal({ errors: error.errors }, "Environment validation failed");
      console.error("\n❌ Configuration Error:\n");
      error.errors.forEach((err) => {
        console.error(`  • ${err.path.join(".")}: ${err.message}`);
      });
      console.error("\nPlease check your .env file and try again.\n");
    } else {
      logger.fatal({ error }, "Unexpected error validating environment");
    }
    process.exit(1);
  }
}

/**
 * Validated and typed environment configuration.
 */
export const env = validateEnv();

/**
 * Feature flags derived from environment variables.
 * A feature is enabled only when ALL required variables are present.
 */
export const features = {
  githubPrPolling:
    !!env.githubToken &&
    !!env.githubOwner &&
    !!env.githubRepo &&
    !!env.githubPrAnnounceChannelId,

  githubAssigneePolling:
    !!env.githubToken &&
    !!env.githubOwner &&
    !!env.githubRepo &&
    !!env.githubAssigneeAnnounceChannelId,

  openai: !!env.openaiApiKey,

  claude: !!env.claudeApiKey,

  weather: !!env.weatherApiKey,

  autoRole: !!env.autoRoleId,

  welcomeMessages: !!env.welcomeChannelId,
} as const;

/**
 * Log feature status on startup.
 */
export function logFeatureStatus(): void {
  logger.info({ features }, "Feature flags");
}
