// src/bot.ts
(globalThis as { __omegabotStartTime?: number }).__omegabotStartTime = Date.now();

import { initDatabase, closeDatabase } from "./services/core/database/db.js";
import { startMetricsServer, stopMetricsServer } from "./services/core/metrics/server.js";

import { Client, GatewayIntentBits, Partials } from "discord.js";
import { setupChatMessageHandler } from "./services/discord/discord/chatMessageHandler.js";
import { getDiscordErrorCode } from "./services/discord/discord/interaction/interactionErrors.js";
import {
  loadCommands,
  type CommandClient,
} from "./services/discord/discord/commandLoader.js";
import { handleInteraction } from "./services/discord/discord/interaction/interactionHandler.js";
import { pollPullRequestsOnce } from "./services/integrations/github/prPoller.js";
import { pollIssueAssigneesOnce } from "./services/integrations/github/issueAssigneePoller.js";
import { handleAutoRole } from "./services/stores/roles/autoRoleHandler.js";
import { onGuildMemberAdd } from "./services/integrations/welcome/welcomeHandler.js";
import { setupStarboardListeners } from "./services/integrations/starboard/starboardHandler.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { createReminderScheduler } from "./services/stores/reminders/index.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User, Partials.Channel],
}) as CommandClient;

client.commands = new Map();

initDatabase();
logger.info("Database initialized");

if (!process.env.BACKUP_KEEP?.trim()) {
  logger.info(
    "[startup] BACKUP_KEEP not set; consider running npm run db:backup periodically",
  );
}

// Catch unhandled promise rejections (e.g. from collectors or async handlers)
process.on("unhandledRejection", (reason, promise) => {
  const code = getDiscordErrorCode(reason);
  if (code === 10008 || code === 10062 || code === 40060) {
    logger.info(
      { reason, code },
      "[unhandledRejection] Discord interaction error (user may see 'failed to complete')",
    );
  } else {
    logger.error({ reason, promise }, "[unhandledRejection] uncaught promise rejection");
  }
});

await loadCommands(client);

client.reminderScheduler = createReminderScheduler(client);

client.on("interactionCreate", async (interaction) => {
  await handleInteraction(interaction, client);
});

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

const githubPrPollingEnabled = env.githubPrPollingEnabled;
const githubAssigneePollingEnabled = env.githubAssigneePollingEnabled;

client.once("clientReady", () => {
  logger.info("OmegaBot is online");

  // Setup starboard reaction listeners
  setupStarboardListeners(client);

  // Chat via message: DM or @mention the bot (uses OPENAI_API_KEY / ANTHROPIC_API_KEY)
  setupChatMessageHandler(client);

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

  // Optional features (so misconfig is obvious from logs)
  logger.info(
    {
      weather: Boolean(env.weatherApiKey),
      summary: env.summaryMode,
      hangmanAdmin: Boolean(process.env.HANGMAN_ADMIN_ROLE_ID?.trim()),
      jokeModerator: Boolean(process.env.JOKE_MODERATOR_ROLE_ID?.trim()),
      autoRole: Boolean(env.discordAutoRoleId),
    },
    "[startup] optional features",
  );

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

  startMetricsServer(client);
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutting down...");

  try {
    client.reminderScheduler?.stop();
    logger.info("Reminder scheduler stopped");
  } catch (err) {
    logger.warn({ err }, "Failed to stop reminder scheduler cleanly");
  }

  stopMetricsServer();

  try {
    await client.destroy();
  } catch (err) {
    logger.warn({ err }, "Error closing Discord connection");
  }

  closeDatabase();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void client.login(env.token);

if (githubPrPollingEnabled || githubAssigneePollingEnabled) {
  setInterval(() => {
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
