import { Client, GatewayIntentBits } from "discord.js";
import { loadCommands, type CommandClient } from "./services/discord/commandLoader.js";
import { handleInteraction } from "./services/discord/interactionHandler.js";
import { pollPullRequestsOnce } from "./services/github/prPoller.js";
import { env } from "./config/env.js";

/**
 * Create the Discord client with only the intents required for slash-command handling.
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
}) as CommandClient;

/**
 * Initialize the command registry.
 */
client.commands = new Map();

/**
 * Load and register slash commands.
 */
await loadCommands(client);

/**
 * Route all interactions through the central handler.
 */
client.on("interactionCreate", async (interaction) => {
  await handleInteraction(interaction, client);
});

/**
 * Start background services once the bot is fully ready.
 */
client.once("clientReady", () => {
  console.log("OmegaBot is online");

  // Poll GitHub every 5 minutes
  setInterval(
    async () => {
      try {
        await pollPullRequestsOnce({
          client,
          owner: "NickTheDevOpsGuy",
          repo: "OmegaBot",
          announceChannelId: "1450641533509439538",
        });
      } catch (err) {
        console.error("[prPoller] failed", err);
      }
    },
    5 * 60 * 1000,
  );
});

/**
 * Connect to Discord.
 */
client.login(env.token);
