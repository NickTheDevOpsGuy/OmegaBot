// src/commands/admin/subcommands/health.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";
import { getInteractionErrorCounts } from "../../../services/discord/interactionErrors.js";
import { EmbedColors } from "../../../utils/colors.js";
import { safeReply } from "../utils.js";
import { env } from "../../../config/env.js";

const OPTIONAL_CHECK_TIMEOUT_MS = 3000;

async function checkWeatherReachable(): Promise<string> {
  const key = env.weatherApiKey;
  if (!key) return "⚠️ Not configured";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), OPTIONAL_CHECK_TIMEOUT_MS);
    const r = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${key}&q=London`,
      { signal: ctrl.signal },
    );
    clearTimeout(t);
    return r.ok ? "✅ Reachable" : `⚠️ API error ${r.status}`;
  } catch (e) {
    return `❌ Unreachable (${e instanceof Error ? e.message : String(e).slice(0, 50)})`;
  }
}

async function checkGitHubReachable(): Promise<string> {
  const token = env.githubToken;
  if (!token) return "⚠️ Not configured";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), OPTIONAL_CHECK_TIMEOUT_MS);
    const r = await fetch("https://api.github.com/rate_limit", {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return r.ok ? "✅ Reachable" : `⚠️ API error ${r.status}`;
  } catch (e) {
    return `❌ Unreachable (${e instanceof Error ? e.message : String(e).slice(0, 50)})`;
  }
}

export async function handleHealth(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    const checks: { name: string; status: string; details?: string }[] = [];

    try {
      const db = getDb();
      db.prepare("SELECT 1").get();
      checks.push({ name: "Database", status: "✅ Healthy" });
    } catch (error) {
      checks.push({
        name: "Database",
        status: "❌ Error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const interactionErrors = getInteractionErrorCounts();
    const totalErrors = Object.values(interactionErrors).reduce((a, b) => a + b, 0);
    if (totalErrors > 0) {
      const details = Object.entries(interactionErrors)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      checks.push({
        name: "Interaction errors (since startup)",
        status: totalErrors > 10 ? "⚠️ Elevated" : "ℹ️ Counts",
        details,
      });
    }

    const requiredEnvVars = ["DISCORD_TOKEN", "DISCORD_APP_ID"];
    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

    if (missingVars.length === 0) {
      checks.push({ name: "Environment", status: "✅ Required vars set" });
    } else {
      checks.push({
        name: "Environment",
        status: "⚠️ Missing vars",
        details: missingVars.join(", "),
      });
    }

    const optionalKeys = [
      { name: "Anthropic (Claude)", key: "ANTHROPIC_API_KEY" },
      { name: "GitHub", key: "GITHUB_TOKEN" },
      { name: "Weather API", key: "WEATHERAPI_KEY" },
    ];

    for (const { name, key } of optionalKeys) {
      checks.push({
        name,
        status: process.env[key] ? "✅ Configured" : "⚠️ Not configured",
      });
    }

    const [weatherStatus, githubStatus] = await Promise.all([
      checkWeatherReachable(),
      checkGitHubReachable(),
    ]);
    checks.push({ name: "Weather API (reachability)", status: weatherStatus });
    checks.push({ name: "GitHub API (reachability)", status: githubStatus });

    const embed = new EmbedBuilder()
      .setTitle("Health Check")
      .setColor(EmbedColors.Info)
      .setDescription(
        checks
          .map((c) =>
            c.details
              ? `**${c.name}:** ${c.status}\n${c.details}`
              : `**${c.name}:** ${c.status}`,
          )
          .join("\n\n"),
      )
      .setTimestamp();

    await safeReply(interaction, { embeds: [embed], ephemeral: true });
    logger.info({ userId: interaction.user.id }, "[admin] viewed health");
  } catch (error) {
    logger.error({ error }, "[admin] health check failed");
    await safeReply(interaction, {
      content: "❌ Failed to run health check",
      ephemeral: true,
    });
  }
}
