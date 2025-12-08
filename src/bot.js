import { Client, GatewayIntentBits } from "discord.js";
import { loadCommands } from "./services/discord/commandLoader.js";
import { handleInteraction } from "./services/discord/interactionHandler.js";
import { env } from "./config/env.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

client.commands = new Map();

// top level await is allowed in ESM
await loadCommands(client);

client.on("interactionCreate", async interaction => {
  await handleInteraction(interaction, client);
});

client.once("clientReady", () => {
  console.log("OmegaBot is online");
});

client.login(env.token);