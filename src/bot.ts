// src/bot.ts
import { initDatabase, closeDatabase } from "./services/database/db.js";

import { Client, GatewayIntentBits } from "discord.js";
import { loadCommands, type CommandClient } from "./services/discord/commandLoader.js";
import { handleInteraction } from "./services/discord/interactionHandler.js";
import { pollPullRequestsOnce } from "./services/github/prPoller.js";
import { pollIssueAssigneesOnce } from "./services/github/issueAssigneePoller.js";
import { handleAutoRole } from "./services/roles/autoRoleHandler.js";
import { onGuildMemberAdd } from "./services/welcome/welcomeHandler.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { createReminderScheduler } from "./services/reminders/index.js";

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
 * Start the database.
 */
initDatabase();
logger.info("Database initialized");

/**
 * Load compiled slash command modules.
 */
await loadCommands(client);

/**
 * Reminder scheduler (SQLite-backed).
 *
 * We attach it to the client so commands can access it.
 * We start it on clientReady so channel fetching is reliable.
 */
client.reminderScheduler = createReminderScheduler(client);

/**
 * Handle slash command interactions.
 */
client.on("interactionCreate", async (interaction) => {
  await handleInteraction(interaction, client);
});

/**
 * Welcome handler for new guild members.
 */
client.on("guildMemberAdd", async (member) => {
  logger.info(
    {
      guildId: member.guild.id,
      userId: member.user.id,
      username: member.user.username,
    },
    "guildMemberAdd event fired",
  );

  await handleAutoRole(member);
  await onGuildMemberAdd(member);
});

/**
 * Optional GitHub polling.
 */
const githubPrPollingEnabled = env.githubPrPollingEnabled;
const githubAssigneePollingEnabled = env.githubAssigneePollingEnabled;

let isReady = false;

/**
 * Log once when the bot is ready.
 */
client.once("clientReady", () => {
  logger.info("OmegaBot is online");
  isReady = true;

  // DEBUG: prove which bot/app is actually connected
  logger.info(
    {
      loggedInAs: client.user
        ? `${client.user.username}#${client.user.discriminator}`
        : null,
      botUserId: client.user?.id ?? null,
      envAppId: env.appId ?? null,
      guildId: env.guildId ?? null,
    },
    "[startup] bot identity",
  );

  logger.info({ commands: [...client.commands.keys()] }, "[startup] commands loaded");

  // Start reminder scheduler now that client is ready
  try {
    client.reminderScheduler?.start();
    logger.info("Reminder scheduler started");
  } catch (err) {
    logger.error({ err }, "Failed to start reminder scheduler");
  }

  if (githubPrPollingEnabled) {
    logger.info(
      {
        owner: env.githubOwner,
        repo: env.githubRepo,
        channelId: env.githubPrAnnounceChannelId,
        intervalMs: env.githubPollIntervalMs,
      },
      "GitHub PR polling enabled (new PRs)",
    );
  } else {
    logger.info("GitHub PR polling disabled");
  }

  if (githubAssigneePollingEnabled) {
    logger.info(
      {
        owner: env.githubOwner,
        repo: env.githubRepo,
        channelId: env.githubAssigneeAnnounceChannelId,
        intervalMs: env.githubPollIntervalMs,
      },
      "GitHub assignee polling enabled (assignee changes)",
    );
  } else {
    logger.info("GitHub assignee polling disabled");
  }

  if (!githubPrPollingEnabled && !githubAssigneePollingEnabled) {
    logger.info("GitHub polling disabled");
  }
});

/**
 * Shutdown handler (graceful).
 */
function shutdown(signal: string): void {
  logger.info({ signal }, "Shutting down...");

  try {
    client.reminderScheduler?.stop();
    logger.info("Reminder scheduler stopped");
  } catch (err) {
    logger.warn({ err }, "Failed to stop reminder scheduler cleanly");
  }

  closeDatabase();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

void client.login(env.token);

/**
 * Schedule GitHub polling (if enabled).
 *
 * IMPORTANT:
 * Promises inside setInterval must be caught, or Node will emit unhandledRejection.
 */
if (githubPrPollingEnabled || githubAssigneePollingEnabled) {
  setInterval(() => {
    // Optional readiness guard: don't poll until Discord client is ready.
    if (!isReady) return;

    if (githubPrPollingEnabled) {
      void pollPullRequestsOnce({
        client,
        owner: env.githubOwner!,
        repo: env.githubRepo!,
        announceChannelId: env.githubPrAnnounceChannelId!,
      }).catch((err) => {
        logger.error({ err }, "[github] pollPullRequestsOnce failed");
      });
    }

    if (githubAssigneePollingEnabled) {
      void pollIssueAssigneesOnce({
        client,
        owner: env.githubOwner!,
        repo: env.githubRepo!,
        announceChannelId: env.githubAssigneeAnnounceChannelId!,
      }).catch((err) => {
        logger.error({ err }, "[github] pollIssueAssigneesOnce failed");
      });
    }
  }, env.githubPollIntervalMs);
}
