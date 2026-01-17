// src/services/discord/commandLoader.ts
import type { Client, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";
import type { SlashCommandBuilder } from "discord.js";
import type { PermissionRequirements } from "../permissions/middleware.js";
import { logger } from "../../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Command structure with permissions support.
 */
export interface Command {
  /** Command data (name, description, options) */
  data: SlashCommandBuilder;
  /** Execute function when command is invoked */
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  /** Optional autocomplete handler */
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  /** Optional permission requirements */
  permissions?: PermissionRequirements;
}

/**
 * Extended client type with command registry.
 */
export interface CommandClient extends Client {
  commands: Map<string, Command>;
}

/**
 * Recursively find all command files in a directory.
 */
function findCommandFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip subcommands directories
      if (entry.name !== "subcommands") {
        files.push(...findCommandFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Load all command modules from dist/commands.
 */
export async function loadCommands(client: CommandClient): Promise<void> {
  const commandsPath = path.join(__dirname, "../../commands");

  if (!fs.existsSync(commandsPath)) {
    logger.error({ commandsPath }, "Commands directory not found");
    throw new Error("Commands directory not found. Did you run 'npm run build'?");
  }

  const commandFiles = findCommandFiles(commandsPath);

  logger.info(
    {
      commandsPath,
      fileCount: commandFiles.length,
    },
    "Loading commands",
  );

  let loadedCount = 0;
  let failedCount = 0;

  for (const filePath of commandFiles) {
    try {
      // Dynamic import with file:// protocol
      const fileUrl = new URL(`file://${filePath}`);
      const commandModule = await import(fileUrl.href);

      // Validate command structure
      if (!commandModule.data || !commandModule.execute) {
        logger.warn({ filePath }, "Invalid command module (missing data or execute)");
        failedCount++;
        continue;
      }

      const command: Command = {
        data: commandModule.data,
        execute: commandModule.execute,
        autocomplete: commandModule.autocomplete,
        permissions: commandModule.permissions,
      };

      // Register command
      client.commands.set(command.data.name, command);
      loadedCount++;

      logger.debug(
        {
          name: command.data.name,
          hasPermissions: !!command.permissions,
          hasAutocomplete: !!command.autocomplete,
        },
        "Command loaded",
      );
    } catch (error) {
      logger.error({ error, filePath }, "Failed to load command");
      failedCount++;
    }
  }

  logger.info(
    {
      loaded: loadedCount,
      failed: failedCount,
      total: commandFiles.length,
    },
    "Command loading complete",
  );

  if (loadedCount === 0) {
    throw new Error("No commands loaded. Check your commands directory.");
  }
}
