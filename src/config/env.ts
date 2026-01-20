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
  throw new Error("OPENAI_API_KEY is required when SUMMARY_MODE=llm");
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

  /* ---------------------------------------------------------------- */
  /* Summaries (OpenAI)                                               */
  /* ---------------------------------------------------------------- */

  summaryMode,

  openAIKey,
  openAIModel,

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
    if (!token) throw new Error("GITHUB_TOKEN is required for this GitHub feature");
    return token;
  },
};
