import { Client, GatewayIntentBits } from "discord.js";
import { loadCommands, type CommandClient } from "./services/discord/commandLoader.js";
import { handleInteraction } from "./services/discord/interactionHandler.js";
import { env } from "./config/env.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
}) as CommandClient;

client.commands = new Map();

await loadCommands(client);

client.on("interactionCreate", async interaction => {
  await handleInteraction(interaction, client);
});

client.once("clientReady", () => {
  console.log("OmegaBot is online");
});

client.login(env.token);
