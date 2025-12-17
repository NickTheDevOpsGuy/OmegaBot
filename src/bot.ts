// src/bot.ts

import { Client, GatewayIntentBits } from "discord.js";
import {
  loadCommands,
  type CommandClient,
} from "./services/discord/commandLoader.js";
import { handleInteraction } from "./services/discord/interactionHandler.js";
import { pollPullRequestsOnce } from "./services/github/prPoller.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

/**
 * Create the Discord client with only the intents required for slash commands.
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
}) as CommandClient;

/**
 * Command registry populated by the command loader.
 */
client.commands = new Map();

/**
 * Load compiled command modules and attach them to client.commands.
 */
await loadCommands(client);

/**
 * Forward every incoming interaction to the central handler.
 */
client.on("interactionCreate", async (interaction) => {
  await handleInteraction(interaction, client);
});

/**
 * GitHub PR polling is optional.
 * We only enable it when all required env vars are present.
 */
const githubPollingEnabled =
  !!env.githubToken &&
  !!env.githubOwner &&
  !!env.githubRepo &&
  !!env.githubAnnounceChannelId;

/**
 * Log a confirmation once the bot successfully connects.
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
    logger.info("GitHub PR polling disabled (missing env config)");
  }
});

/**
 * Start the bot session using the configured token.
 */
void client.login(env.token);

/**
 * Schedule PR polling (if enabled).
 * Uses void to avoid unhandled promise warnings.
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