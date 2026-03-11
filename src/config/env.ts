// src/config/env.ts

import dotenv from "dotenv";
dotenv.config({ path: ".env" });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in environment`);
  return value;
}

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;

  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return defaultValue;
  if (n <= 0) return defaultValue;

  return n;
}

type SummaryMode = "local" | "llm";

const summaryMode = (process.env.SUMMARY_MODE ?? "local") as SummaryMode;

// OpenAI settings
const openAIKey = process.env.OPENAI_API_KEY?.trim() || null;

/**
 * Configurable model so code does not hardcode it.
 * Default is a good cost/perf option for summaries.
 */
const openAIModel = (process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini") as string;

// Fail fast ONLY when LLM summaries are explicitly enabled
if (summaryMode === "llm" && !openAIKey) {
  throw new Error(
    "OPENAI_API_KEY is required when SUMMARY_MODE=llm. Set it in .env (see .env.example)",
  );
}

const legacyGithubAnnounceChannelId = process.env.GITHUB_ANNOUNCE_CHANNEL_ID ?? null;

// New split channels (fall back to legacy)
const githubPrAnnounceChannelId =
  process.env.GITHUB_PR_ANNOUNCE_CHANNEL_ID ?? legacyGithubAnnounceChannelId;

const githubAssigneeAnnounceChannelId =
  process.env.GITHUB_ASSIGNEE_ANNOUNCE_CHANNEL_ID ?? legacyGithubAnnounceChannelId;

export const env = {
  /* ---------------------------------------------------------------- */
  /* Discord (required)                                               */
  /* ---------------------------------------------------------------- */

  token: requireEnv("DISCORD_TOKEN"),
  appId: requireEnv("DISCORD_APP_ID"),

  guildId: process.env.DISCORD_GUILD_ID ?? null,

  discordAutoRoleId: process.env.DISCORD_AUTO_ROLE_ID ?? null,

  /**
   * Discord user IDs allowed to use /admin moderation (timeout, kick, ban).
   * Comma-separated; e.g. ADMIN_USER_IDS=123456789,987654321
   * If set, these users can run admin commands even without Discord moderator roles.
   */
  adminUserIds: (() => {
    const raw = process.env.ADMIN_USER_IDS?.trim();
    if (!raw) return new Set<string>();
    return new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );
  })(),

  /**
   * Optional: Discord role IDs that are allowed to use /admin moderation (timeout, kick, ban).
   * Comma-separated; e.g. MODERATION_ALLOWED_ROLE_IDS=111111111,222222222
   * If set, only users with one of these roles (or in ADMIN_USER_IDS) can run timeout/kick/ban.
   * If unset, normal moderator check applies (Administrator, Manage Server, Moderate Members, or /config moderator-role).
   */
  moderationAllowedRoleIds: (() => {
    const raw = process.env.MODERATION_ALLOWED_ROLE_IDS?.trim();
    if (!raw) return new Set<string>();
    return new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );
  })(),

  /* ---------------------------------------------------------------- */
  /* Summaries (OpenAI)                                               */
  /* ---------------------------------------------------------------- */

  summaryMode,

  openAIKey,
  openAIModel,

  /* ---------------------------------------------------------------- */
  /* Weather API                                                       */
  /* ---------------------------------------------------------------- */

  weatherApiKey: process.env.WEATHERAPI_KEY?.trim() || null,

  /* ---------------------------------------------------------------- */
  /* GitHub                                                           */
  /* ---------------------------------------------------------------- */

  githubToken: process.env.GITHUB_TOKEN ?? null,
  githubOwner: process.env.GITHUB_OWNER ?? null,
  githubRepo: process.env.GITHUB_REPO ?? null,

  githubAnnounceChannelId: legacyGithubAnnounceChannelId,
  githubPrAnnounceChannelId,
  githubAssigneeAnnounceChannelId,

  githubPollIntervalMs: envInt("GITHUB_POLL_INTERVAL_MS", 60_000),

  githubAnnouncementsEnabled:
    Boolean(process.env.GITHUB_TOKEN) &&
    Boolean(process.env.GITHUB_OWNER) &&
    Boolean(process.env.GITHUB_REPO) &&
    Boolean(process.env.GITHUB_ANNOUNCE_CHANNEL_ID),

  githubPrPollingEnabled:
    Boolean(process.env.GITHUB_TOKEN) &&
    Boolean(process.env.GITHUB_OWNER) &&
    Boolean(process.env.GITHUB_REPO) &&
    Boolean(githubPrAnnounceChannelId),

  githubAssigneePollingEnabled:
    Boolean(process.env.GITHUB_TOKEN) &&
    Boolean(process.env.GITHUB_OWNER) &&
    Boolean(process.env.GITHUB_REPO) &&
    Boolean(githubAssigneeAnnounceChannelId),

  requireGithubToken(): string {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is required. Set it in .env (see .env.example)");
    }
    return token;
  },

  requireWeatherApiKey(): string {
    const key = process.env.WEATHERAPI_KEY?.trim();
    if (!key) {
      throw new Error(
        "WEATHERAPI_KEY is required for weather. Set it in .env (see .env.example)",
      );
    }
    return key;
  },
};
