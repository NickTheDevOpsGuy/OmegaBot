// src/services/discord/commandLoader.ts

import fs from "fs";
import path from "path";
import {
  Client,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";

/**
 * Contract that every slash command module must follow.
 *
 * - `data` describes the command to Discord (name, description, options)
 * - `execute` runs when a user invokes the command
 */
export interface SlashCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * Discord Client extended with a command registry.
 */
export type CommandClient = Client & {
  commands: Map<string, SlashCommand>;
};

/**
 * Load all compiled command modules from dist/commands and register them into client.commands.
 *
 * Notes:
 * - We load from dist/ because the bot runs compiled JS.
 * - A single broken command should not crash the entire bot.
 */
export async function loadCommands(client: CommandClient): Promise<void> {
  const basePath = path.join(process.cwd(), "dist/commands");

  if (!fs.existsSync(basePath)) {
    logger.error(
      { basePath },
      "Command loader base path not found. Did you build the project?",
    );
    return;
  }

  const groups = fs.readdirSync(basePath);
  let loadedCount = 0;

  for (const group of groups) {
    const groupPath = path.join(basePath, group);
    if (!fs.statSync(groupPath).isDirectory()) continue;

    const files = fs.readdirSync(groupPath);

    for (const file of files) {
      if (!file.endsWith(".js")) continue;

      const fullPath = path.join(groupPath, file);

      try {
        const mod = (await import(fullPath)) as Partial<SlashCommand>;

        if (!mod.data || !mod.execute) {
          logger.warn(
            { file: `${group}/${file}` },
            "Skipping command module (missing data or execute)",
          );
          continue;
        }

        const name = mod.data.name;

        if (!name || typeof name !== "string") {
          logger.warn(
            { file: `${group}/${file}` },
            "Skipping command module (invalid command name)",
          );
          continue;
        }

        // Avoid silent overwrites if two commands share the same name
        if (client.commands.has(name)) {
          logger.warn(
            { name, file: `${group}/${file}` },
            "Duplicate command name detected. Skipping this module.",
          );
          continue;
        }

        client.commands.set(name, mod as SlashCommand);
        loadedCount += 1;
      } catch (err) {
        logger.error(
          { err, file: `${group}/${file}`, fullPath },
          "Failed to import command module",
        );
      }
    }
  }

  logger.info({ loadedCount }, "Commands loaded");
}
