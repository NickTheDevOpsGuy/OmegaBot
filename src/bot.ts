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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
}) as CommandClient;

client.commands = new Map();

initDatabase();
logger.info("Database initialized");

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
