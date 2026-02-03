// src/commands/admin/subcommands/stats.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";
import { getFunUsageSnapshot } from "../../../services/fun/funUsageStore.js";
import { EmbedColors } from "../../../utils/colors.js";
import { safeReply, withRetry } from "../utils.js";

export async function handleStats(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  let jokeCount: number | null = null;
  let coinFlipCount: number | null = null;
  let totalCommands = 0;
  let uniqueUsers = 0;

  try {
    const db = getDb();
    jokeCount = await withRetry("stats:jokesCount", () => {
      const row = db.prepare("SELECT COUNT(*) as count FROM jokes").get() as {
        count: number;
      };
      return row.count;
    });
    coinFlipCount = await withRetry("stats:coinFlipCount", () => {
      const row = db.prepare("SELECT COUNT(*) as count FROM coin_flips").get() as {
        count: number;
      };
      return row.count;
    });
  } catch (err) {
    logger.error({ err }, "[admin] stats DB counts failed");
  }

  try {
    const funUsage = await withRetry("stats:funUsageSnapshot", () =>
      getFunUsageSnapshot(),
    );
    const totals = (funUsage?.totalsByCommand ?? {}) as Record<string, number>;
    totalCommands = Object.values(totals).reduce(
      (sum, count) => sum + (Number.isFinite(count) ? count : 0),
      0,
    );
    uniqueUsers = Object.keys(funUsage?.totalsByUser ?? {}).length;
  } catch (err) {
    logger.error({ err }, "[admin] stats fun usage failed");
  }

  try {
    const uptimeSeconds = process.uptime();
    const uptimeDays = Math.floor(uptimeSeconds / 86400);
    const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    const embed = new EmbedBuilder()
      .setTitle("Bot Statistics")
      .setColor(EmbedColors.Info)
      .addFields(
        {
          name: "Uptime",
          value: `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`,
          inline: true,
        },
        { name: "Memory", value: `${memUsedMB}MB / ${memTotalMB}MB`, inline: true },
        { name: "Total Commands", value: String(totalCommands), inline: true },
        {
          name: "Jokes",
          value: jokeCount === null ? "N/A" : String(jokeCount),
          inline: true,
        },
        {
          name: "Coin Flips",
          value: coinFlipCount === null ? "N/A" : String(coinFlipCount),
          inline: true,
        },
        { name: "Unique Users", value: String(uniqueUsers), inline: true },
      )
      .setFooter({ text: `Node ${process.version}` })
      .setTimestamp();

    await safeReply(interaction, { embeds: [embed] });
    logger.info({ userId: interaction.user.id }, "[admin] viewed stats");
  } catch (err) {
    logger.error({ err }, "[admin] stats reply failed");
    await safeReply(interaction, {
      content: "❌ Failed to get statistics",
      ephemeral: true,
    });
  }
}
