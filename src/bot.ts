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
import { setupLevelingMessageHandler } from "./services/stores/leveling/messageLeveling.js";
import { setupServerToolsMessageHandler } from "./services/stores/serverTools/messageHandlers.js";
import { setupReactionRoleListeners } from "./services/stores/serverTools/reactionRoleHandler.js";
import { onGuildMemberAdd } from "./services/integrations/welcome/welcomeHandler.js";
import { setupStarboardListeners } from "./services/integrations/starboard/starboardHandler.js";
import { env } from "./config/env.js";
import { normalizeError } from "./utils/errors.js";
import { logger } from "./utils/logger.js";
import { createReminderScheduler } from "./services/stores/reminders/index.js";

const requestedIntents: GatewayIntentBits[] = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.DirectMessages,
];

if (env.guildMembersIntentEnabled) {
  requestedIntents.push(GatewayIntentBits.GuildMembers);
}

if (env.messageContentIntentEnabled) {
  requestedIntents.push(GatewayIntentBits.MessageContent);
}

function requestedPrivilegedIntentNames(): string[] {
  const names: string[] = [];
  if (env.guildMembersIntentEnabled) names.push("Server Members Intent");
  if (env.messageContentIntentEnabled) names.push("Message Content Intent");
  return names;
}

function logDisallowedIntentGuidance(err: Error): void {
  logger.fatal(
    {
      err,
      requestedPrivilegedIntents: requestedPrivilegedIntentNames(),
      hint: "Enable the same privileged intents in Discord Developer Portal -> Bot, or disable them in .env with DISCORD_ENABLE_GUILD_MEMBERS_INTENT=false and/or DISCORD_ENABLE_MESSAGE_CONTENT_INTENT=false.",
    },
    "[startup] Discord rejected privileged intents",
  );
}

const client = new Client({
  intents: requestedIntents,
  partials: [Partials.Message, Partials.Reaction, Partials.User, Partials.Channel],
}) as CommandClient;

client.commands = new Map();

initDatabase();
logger.info("Database initialized");

if (env.notionConfig.enabled) {
  logger.info(
    {
      hasToken: env.notionConfig.hasToken,
      hasDatabaseId: env.notionConfig.hasDatabaseId,
    },
    "[startup] notion integration enabled",
  );
} else if (env.notionConfig.issues.length > 0) {
  logger.warn(
    {
      hasToken: env.notionConfig.hasToken,
      hasDatabaseId: env.notionConfig.hasDatabaseId,
      issues: env.notionConfig.issues,
    },
    "[startup] notion integration partially configured; notion features disabled",
  );
} else {
  logger.info("[startup] notion integration disabled");
}

if (!process.env.BACKUP_KEEP?.trim()) {
  logger.info(
    "[startup] BACKUP_KEEP not set; consider running npm run db:backup periodically",
  );
}

logger.info(
  {
    guildMembersIntentEnabled: env.guildMembersIntentEnabled,
    messageContentIntentEnabled: env.messageContentIntentEnabled,
    requestedPrivilegedIntents: requestedPrivilegedIntentNames(),
  },
  "[startup] discord intents configuration",
);

// Catch unhandled promise rejections (e.g. from collectors or async handlers)
process.on("unhandledRejection", (reason, promise) => {
  const err = normalizeError(reason);
  const code = getDiscordErrorCode(reason);
  if (code === 10008 || code === 10062 || code === 40060) {
    logger.info(
      { err, code },
      "[unhandledRejection] Discord interaction error (user may see 'failed to complete')",
    );
  } else {
    logger.error(
      {
        err,
        code,
        promiseType: typeof promise,
      },
      "[unhandledRejection] uncaught promise rejection",
    );
  }
});

process.on("uncaughtException", (err) => {
  if (err.message.includes("Used disallowed intents")) {
    logDisallowedIntentGuidance(err);
  }
  logger.fatal({ err }, "[uncaughtException] process crash");
  process.exit(1);
});

await loadCommands(client);

client.reminderScheduler = createReminderScheduler(client);

client.on("interactionCreate", async (interaction) => {
  await handleInteraction(interaction, client);
});

if (env.guildMembersIntentEnabled) {
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
} else {
  logger.info(
    "[startup] guildMemberAdd handlers disabled; enable DISCORD_ENABLE_GUILD_MEMBERS_INTENT=true if you want welcome/auto-role flows",
  );
}

const githubPrPollingEnabled = env.githubPrPollingEnabled;
const githubAssigneePollingEnabled = env.githubAssigneePollingEnabled;

client.once("clientReady", () => {
  logger.info("OmegaBot is online");

  // Setup starboard reaction listeners
  setupStarboardListeners(client);
  setupReactionRoleListeners(client);

  if (env.messageContentIntentEnabled) {
    // Chat via message: DM or @mention the bot (uses OPENAI_API_KEY / ANTHROPIC_API_KEY)
    setupChatMessageHandler(client);
    setupLevelingMessageHandler(client);
    setupServerToolsMessageHandler(client);
  } else {
    logger.info(
      "[startup] message-content features disabled; enable DISCORD_ENABLE_MESSAGE_CONTENT_INTENT=true if you want DM/@mention chat and message XP",
    );
  }

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
    logger.error({ err }, "[bot] start reminder scheduler threw");
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
    logger.warn({ err }, "[bot] stop reminder scheduler threw");
  }

  stopMetricsServer();

  try {
    await client.destroy();
  } catch (err) {
    logger.warn({ err }, "[bot] Discord connection close threw");
  }

  closeDatabase();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await client.login(env.token);
} catch (err) {
  const normalized = normalizeError(err);
  if (normalized.message.includes("Used disallowed intents")) {
    logDisallowedIntentGuidance(normalized);
  }
  logger.error({ err: normalized }, "[startup] Discord login failed");
  throw err;
}

if (githubPrPollingEnabled || githubAssigneePollingEnabled) {
  setInterval(() => {
    if (githubPrPollingEnabled) {
      void pollPullRequestsOnce({
        client,
        owner: env.githubOwner!,
        repo: env.githubRepo!,
        announceChannelId: env.githubPrAnnounceChannelId!,
      }).catch((err) => {
        logger.error({ err }, "[github] pollPullRequestsOnce threw");
      });
    }

    if (githubAssigneePollingEnabled) {
      void pollIssueAssigneesOnce({
        client,
        owner: env.githubOwner!,
        repo: env.githubRepo!,
        announceChannelId: env.githubAssigneeAnnounceChannelId!,
      }).catch((err) => {
        logger.error({ err }, "[github] pollIssueAssigneesOnce threw");
      });
    }
  }, env.githubPollIntervalMs);
}
