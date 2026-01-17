// src/bot.ts
import { Client, GatewayIntentBits } from "discord.js";
import { loadCommands, type CommandClient } from "./services/discord/commandLoader.js";
import { handleInteraction } from "./services/discord/interactionHandler.js";
import { pollPullRequestsOnce } from "./services/github/prPoller.js";
import { pollIssueAssigneesOnce } from "./services/github/issueAssigneePoller.js";
import { handleAutoRole } from "./services/roles/autoRoleHandler.js";
import { onGuildMemberAdd } from "./services/welcome/welcomeHandler.js";
import { env, features, logFeatureStatus } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { initDatabase, closeDatabase } from "./services/database/db.js";

/**
 * Initialize database before starting the bot.
 */
try {
  initDatabase();
} catch (error) {
  logger.fatal({ error }, "Failed to initialize database");
  process.exit(1);
}

/**
 * Log feature status on startup.
 */
logFeatureStatus();

/**
 * Create the Discord client.
 *
 * Required intents:
 * - Guilds: base guild access, slash commands
 * - GuildMembers: REQUIRED for guildMemberAdd (welcome messages)
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
}) as CommandClient;

/**
 * Command registry populated by the command loader.
 */
client.commands = new Map();

/**
 * Load compiled slash command modules.
 */
try {
  await loadCommands(client);
} catch (error) {
  logger.fatal({ error }, "Failed to load commands");
  process.exit(1);
}

/**
 * Handle slash command interactions.
 */
client.on("interactionCreate", async (interaction) => {
  try {
    await handleInteraction(interaction, client);
  } catch (error) {
    logger.error({ error }, "Unhandled error in interaction handler");
  }
});

/**
 * Welcome handler for new guild members.
 */
client.on("guildMemberAdd", async (member) => {
  try {
    logger.info(
      {
        guildId: member.guild.id,
        userId: member.user.id,
        username: member.user.username,
      },
      "guildMemberAdd event fired",
    );

    // Auto-assign a default role on join (if configured)
    if (features.autoRole) {
      await handleAutoRole(member);
    }

    // Send welcome message (if configured)
    if (features.welcomeMessages) {
      await onGuildMemberAdd(member);
    }
  } catch (error) {
    logger.error({ error, guildId: member.guild.id, userId: member.user.id }, "Welcome flow failed");
  }
});

/**
 * Handle bot errors.
 */
client.on("error", (error) => {
  logger.error({ error }, "Discord client error");
});

/**
 * Handle warnings.
 */
client.on("warn", (warning) => {
  logger.warn({ warning }, "Discord client warning");
});

/**
 * Log once when the bot is ready.
 */
client.once("ready", () => {
  logger.info(
    {
      username: client.user?.username,
      id: client.user?.id,
      guilds: client.guilds.cache.size,
    },
    "OmegaBot is online",
  );

  // Log GitHub polling status
  if (features.githubPrPolling) {
    logger.info(
      {
        owner: env.githubOwner,
        repo: env.githubRepo,
        channelId: env.githubPrAnnounceChannelId,
        intervalMs: env.githubPollIntervalMs,
      },
      "GitHub PR polling enabled",
    );
  }

  if (features.githubAssigneePolling) {
    logger.info(
      {
        owner: env.githubOwner,
        repo: env.githubRepo,
        channelId: env.githubAssigneeAnnounceChannelId,
        intervalMs: env.githubPollIntervalMs,
      },
      "GitHub assignee polling enabled",
    );
  }
});

/**
 * Graceful shutdown handler.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down gracefully");

  try {
    // Stop accepting new commands
    client.destroy();

    // Close database connection
    closeDatabase();

    logger.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
    process.exit(1);
  }
}

// Register shutdown handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception");
  shutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
  shutdown("UNHANDLED_REJECTION");
});

/**
 * Start the bot.
 */
try {
  await client.login(env.token);
} catch (error) {
  logger.fatal({ error }, "Failed to login");
  process.exit(1);
}

/**
 * Schedule GitHub polling (if enabled).
 */
if (features.githubPrPolling || features.githubAssigneePolling) {
  const pollInterval = setInterval(() => {
    // PR creation polling
    if (features.githubPrPolling) {
      pollPullRequestsOnce({
        client,
        owner: env.githubOwner!,
        repo: env.githubRepo!,
        announceChannelId: env.githubPrAnnounceChannelId!,
      }).catch((error) => {
        logger.error({ error }, "GitHub PR polling failed");
      });
    }

    // Assignee change polling
    if (features.githubAssigneePolling) {
      pollIssueAssigneesOnce({
        client,
        owner: env.githubOwner!,
        repo: env.githubRepo!,
        announceChannelId: env.githubAssigneeAnnounceChannelId!,
      }).catch((error) => {
        logger.error({ error }, "GitHub assignee polling failed");
      });
    }
  }, env.githubPollIntervalMs);

  // Clear interval on shutdown
  process.on("SIGTERM", () => clearInterval(pollInterval));
  process.on("SIGINT", () => clearInterval(pollInterval));
}
