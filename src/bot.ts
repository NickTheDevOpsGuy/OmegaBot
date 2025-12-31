// src/bot.ts

import { Client, GatewayIntentBits } from "discord.js";
import { loadCommands, type CommandClient } from "./services/discord/commandLoader.js";
import { handleInteraction } from "./services/discord/interactionHandler.js";
import { pollPullRequestsOnce } from "./services/github/prPoller.js";
import { onGuildMemberAdd } from "./services/welcome/welcomeHandler.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

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
await loadCommands(client);

/**
 * Handle slash command interactions.
 */
client.on("interactionCreate", async (interaction) => {
  await handleInteraction(interaction, client);
});

/**
 * Welcome handler for new guild members.
 *
 * This will ONLY fire if:
 * - Server Members Intent is enabled in the portal
 * - GatewayIntentBits.GuildMembers is requested here
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

  await onGuildMemberAdd(member);
});

/**
 * Optional GitHub PR polling.
 * Enabled only when all required env vars are present.
 */
const githubPollingEnabled =
  !!env.githubToken &&
  !!env.githubOwner &&
  !!env.githubRepo &&
  !!env.githubAnnounceChannelId;

/**
 * Log once when the bot is ready.
 */
client.once("clientReady", () => {
  logger.info("OmegaBot is online");

  if (githubPollingEnabled) {
    logger.info(
      {
        owner: env.githubOwner,
        repo: env.githubRepo,
        channelId: env.githubAnnounceChannelId,
        intervalMs: env.githubPollIntervalMs,
      },
      "GitHub PR polling enabled",
    );
  } else {
    logger.info("GitHub PR polling disabled");
  }
});

/**
 * Start the bot.
 */
void client.login(env.token);

/**
 * Schedule GitHub PR polling (if enabled).
 */
if (githubPollingEnabled) {
  setInterval(() => {
    void pollPullRequestsOnce({
      client,
      owner: env.githubOwner!,
      repo: env.githubRepo!,
      announceChannelId: env.githubAnnounceChannelId!,
    });
  }, env.githubPollIntervalMs);
}
