// src/services/discord/commandLoader.ts

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
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
 * - Helper modules may exist alongside commands and will be skipped.
 */
export async function loadCommands(client: CommandClient): Promise<void> {
  const basePath = path.join(process.cwd(), "dist", "commands");

  // Diagnostics
  let loadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const loadedNames: string[] = [];
  const skippedFiles: string[] = [];
  const failedFiles: string[] = [];

  if (!fs.existsSync(basePath)) {
    logger.error(
      { basePath },
      "Command loader base path not found. Did you build the project?",
    );
    logger.info({ loadedCount: 0 }, "Commands loaded");
    return;
  }

  const groups = fs.readdirSync(basePath);

  for (const group of groups) {
    const groupPath = path.join(basePath, group);
    if (!fs.statSync(groupPath).isDirectory()) continue;

    const files = fs.readdirSync(groupPath);

    for (const file of files) {
      if (!file.endsWith(".js")) continue;

      const fullPath = path.join(groupPath, file);
      const relFile = `${group}/${file}`;

      try {
        // ESM-safe import path
        const moduleUrl = pathToFileURL(fullPath).href;
        const mod = (await import(moduleUrl)) as Partial<SlashCommand>;

        // Helpers are expected to be skipped
        if (!mod.data || !mod.execute) {
          skippedCount += 1;
          skippedFiles.push(relFile);

          logger.debug(
            { file: relFile },
            "Skipping non-command module (missing data or execute)",
          );
          continue;
        }

        const name = mod.data.name;

        if (!name || typeof name !== "string") {
          skippedCount += 1;
          skippedFiles.push(relFile);

          logger.warn(
            { file: relFile },
            "Skipping command module (invalid command name)",
          );
          continue;
        }

        // Avoid silent overwrites if two commands share the same name
        if (client.commands.has(name)) {
          skippedCount += 1;
          skippedFiles.push(relFile);

          logger.warn(
            { name, file: relFile },
            "Duplicate command name detected. Skipping this module.",
          );
          continue;
        }

        client.commands.set(name, mod as SlashCommand);
        loadedCount += 1;
        loadedNames.push(name);
      } catch (err) {
        failedCount += 1;
        failedFiles.push(relFile);

        logger.warn({ err, file: relFile, fullPath }, "Failed to import command module");
      }
    }
  }

  // Summary (info)
  logger.info(
    {
      loadedCount,
      loadedNames,
      skippedCount,
      failedCount,
    },
    "Commands loaded",
  );

  // Details only when useful
  if (failedCount > 0) {
    logger.warn(
      { failedCount, failedFiles },
      "One or more command modules failed to load",
    );
  }

  // Keep skip list debug-only to avoid noise
  logger.debug({ skippedCount, skippedFiles }, "Non-command modules skipped");
}
