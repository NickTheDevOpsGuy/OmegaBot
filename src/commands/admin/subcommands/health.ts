// src/commands/admin/subcommands/health.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";
import { EmbedColors } from "../../../utils/colors.js";
import { safeReply } from "../utils.js";

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
