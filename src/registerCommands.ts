import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { env } from "./config/env.js";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";

/*
 * Read all compiled command definitions and prepare them for registration
 * with the Discord API.
 *
 * This function:
 * - walks through dist/commands/
 * - loads every compiled .js command file
 * - extracts each command’s JSON definition
 * - returns them in an array for API registration
 */
async function loadCommandData() {
  const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

  // Commands are loaded from compiled JS in dist/
  const basePath = path.join(process.cwd(), "dist/commands");
  const groups = fs.readdirSync(basePath);

  for (const group of groups) {
    const groupPath = path.join(basePath, group);

    // Skip stray files — only process folders
    if (!fs.statSync(groupPath).isDirectory()) continue;

    const files = fs.readdirSync(groupPath);

    for (const file of files) {
      // Only load compiled command files
      if (!file.endsWith(".js")) continue;

      const modulePath = path.join(groupPath, file);
      const mod = await import(modulePath);

      /*
       * Each command module exports `data`,
       * which contains a SlashCommandBuilder.
       * Convert that builder to JSON and push it into the list.
       */
      if (mod.data) {
        commands.push(mod.data.toJSON());
      }
    }
  }

  return commands;
}

/*
 * Register all slash commands with Discord for the configured application & guild.
 *
 * This uses REST.put() to completely replace the current slash-command set
 * for the guild. This makes command updates instant for testing.
 */
async function register() {
  const rest = new REST({ version: "10" }).setToken(env.token);

  const commands = await loadCommandData();

  /*
   * Overwrite the guild’s existing slash commands with the updated list.
   * This is preferred during development because changes propagate immediately.
   */
  await rest.put(Routes.applicationGuildCommands(env.appId, env.guildId), {
    body: commands,
  });

  console.log("Commands registered.");
}

/*
 * Wrapper so errors throw clearly and stop the script immediately.
 */
register().catch((err) => {
  console.error("Failed to register commands:", err);
  process.exit(1);
});
