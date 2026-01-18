// src/commands/admin/admin.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { getDb } from "../../services/database/db.js";
import { getFunUsageSnapshot } from "../../services/fun/funUsageStore.js";
import { EmbedColors } from "../../utils/colors.js";

export const data = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Admin commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("stats")
      .setDescription("Show bot statistics (uptime, database, commands)")
  )
  .addSubcommand((sub) =>
    sub.setName("health").setDescription("Check bot and service health")
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  await interaction.deferReply();

  try {
    if (subcommand === "stats") {
      await handleStats(interaction);
    } else if (subcommand === "health") {
      await handleHealth(interaction);
    } else {
      await interaction.editReply("Unknown subcommand");
    }
  } catch (error) {
    logger.error({ error, subcommand }, "[admin] Command failed");
    await interaction.editReply("❌ Something went wrong");
  }
}

async function handleStats(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const db = getDb();

  // Get database stats
  const jokeCount = db.prepare("SELECT COUNT(*) as count FROM jokes").get() as {
    count: number;
  };

  const coinFlipCount = db
    .prepare("SELECT COUNT(*) as count FROM coin_flips")
    .get() as { count: number };

  // Get fun command usage
  const funUsage = await getFunUsageSnapshot();
  const totalCommands = Object.values(funUsage.totalsByCommand).reduce(
    (sum, count) => sum + count,
    0
  );

  // Calculate uptime
  const uptimeSeconds = process.uptime();
  const uptimeDays = Math.floor(uptimeSeconds / 86400);
  const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

  // Memory usage
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

  const embed = new EmbedBuilder()
    .setTitle("🤖 Bot Statistics")
    .setColor(EmbedColors.Info)
    .addFields(
      {
        name: "⏱️ Uptime",
        value: `\${uptimeDays}d \${uptimeHours}h \${uptimeMinutes}m`,
        inline: true,
      },
      {
        name: "💾 Memory",
        value: `\${memUsedMB}MB / \${memTotalMB}MB`,
        inline: true,
      },
      {
        name: "📊 Total Commands",
        value: totalCommands.toString(),
        inline: true,
      },
      {
        name: "🎭 Jokes",
        value: jokeCount.count.toString(),
        inline: true,
      },
      {
        name: "🪙 Coin Flips",
        value: coinFlipCount.count.toString(),
        inline: true,
      },
      {
        name: "👥 Unique Users",
        value: Object.keys(funUsage.totalsByUser).length.toString(),
        inline: true,
      }
    )
    .setFooter({ text: `Node \${process.version}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  logger.info(
    { userId: interaction.user.id },
    "Admin viewed bot statistics"
  );
}

async function handleHealth(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const checks: { name: string; status: string; details?: string }[] = [];

  // Check database
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

  // Check environment variables
  const requiredEnvVars = [
    "DISCORD_TOKEN",
    "DISCORD_APP_ID",
    "GITHUB_TOKEN",
    "GITHUB_REPO_OWNER",
    "GITHUB_REPO_NAME",
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length === 0) {
    checks.push({ name: "Environment", status: "✅ All vars set" });
  } else {
    checks.push({
      name: "Environment",
      status: "⚠️ Missing vars",
      details: missingVars.join(", "),
    });
  }

  // Check API keys
  const optionalKeys = [
    { name: "Anthropic API", key: "ANTHROPIC_API_KEY" },
    { name: "Weather API", key: "WEATHER_API_KEY" },
  ];

  optionalKeys.forEach(({ name, key }) => {
    if (process.env[key]) {
      checks.push({ name, status: "✅ Configured" });
    } else {
      checks.push({ name, status: "⚠️ Not configured" });
    }
  });

  const embed = new EmbedBuilder()
    .setTitle("🏥 Health Check")
    .setColor(EmbedColors.Info)
    .setDescription(
      checks
        .map((c) =>
          c.details
            ? `**\${c.name}:** \${c.status}\\n  \${c.details}`
            : `**\${c.name}:** \${c.status}`
        )
        .join("\\n\\n")
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  logger.info({ userId: interaction.user.id }, "Admin viewed health check");
}
