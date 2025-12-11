import { Client, GatewayIntentBits } from "discord.js";
import {
  loadCommands,
  type CommandClient,
} from "./services/discord/commandLoader.js";
import { handleInteraction } from "./services/discord/interactionHandler.js";
import { env } from "./config/env.js";
/*
 * Create the Discord client with only the intents required for slash-command handling.
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
}) as CommandClient;

/*
 * Initialize the command registry where loaded slash commands will be stored.
 */
client.commands = new Map();

/*
 * Load and register all compiled command modules before the bot starts handling interactions.
 */
await loadCommands(client);

/*
 * Forward every incoming interaction to the central interaction handler.
 */
client.on("interactionCreate", async (interaction) => {
  await handleInteraction(interaction, client);
});

/*
 * Log a confirmation once the bot successfully connects.
 */
client.once("clientReady", () => {
  console.log("OmegaBot is online");
});

/*
 * Start the bot session using the configured token.
 */
client.login(env.token);
