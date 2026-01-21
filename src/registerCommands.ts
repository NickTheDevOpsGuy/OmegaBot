// src/registerCommands.ts

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

/**
 * Shape every slash command module must export.
 * This matches commandLoader.ts expectations.
 */
type SlashCommandModule = {
  data: SlashCommandBuilder;
};

type CommandJson = ReturnType<SlashCommandBuilder["toJSON"]>;

function readCommandFolders(commandsPath: string): string[] {
  return fs
    .readdirSync(commandsPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function uniqByName(commands: CommandJson[]): { unique: CommandJson[]; dupes: string[] } {
  const seen = new Set<string>();
  const dupes: string[] = [];
  const unique: CommandJson[] = [];

  for (const cmd of commands) {
    const name = cmd.name?.trim();
    if (!name) continue;

    if (seen.has(name)) {
      dupes.push(name);
      continue;
    }
    seen.add(name);
    unique.push(cmd);
  }

  return { unique, dupes };
}

async function registerCommands(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(env.token);

  const commandsPath = path.join(process.cwd(), "dist", "commands");

  if (!fs.existsSync(commandsPath)) {
    throw new Error(`dist/commands not found. Did you forget to run "npm run build"?`);
  }

  const folders = readCommandFolders(commandsPath);

  const commands: CommandJson[] = [];

  for (const folder of folders) {
    const file = path.join(commandsPath, folder, `${folder}.js`);
    const relFile = path.relative(process.cwd(), file).replaceAll("\\", "/");

    if (!fs.existsSync(file)) {
      logger.debug({ folder, file: relFile }, "[register] skip (missing entry file)");
      continue;
    }

    try {
      const moduleUrl = pathToFileURL(file).href;
      const imported = (await import(moduleUrl)) as Partial<SlashCommandModule>;

      if (!imported.data) {
        logger.warn({ folder, file: relFile }, "[register] skip (missing exported data)");
        continue;
      }

      const json = imported.data.toJSON();

      commands.push(json);
      logger.info({ command: imported.data.name, file: relFile }, "[register] prepared");
    } catch (err) {
      logger.warn({ err, folder, file: relFile }, "[register] failed to load");
    }
  }

  if (commands.length === 0) {
    logger.warn("[register] no commands found to register");
    return;
  }

  // Detect duplicates before calling Discord
  const { unique, dupes } = uniqByName(commands);
  if (dupes.length > 0) {
    logger.error(
      { dupes, count: dupes.length },
      "[register] duplicate command names detected (will fail Discord validation)",
    );
    throw new Error(`Duplicate command names: ${[...new Set(dupes)].join(", ")}`);
  }

  logger.info({ count: unique.length }, "[register] registering application commands");

  if (env.guildId) {
    await rest.put(Routes.applicationGuildCommands(env.appId, env.guildId), {
      body: unique,
    });

    logger.info(
      { guildId: env.guildId, count: unique.length },
      "[register] guild commands registered",
    );
  } else {
    await rest.put(Routes.applicationCommands(env.appId), {
      body: unique,
    });

    logger.info({ count: unique.length }, "[register] global commands registered");
  }
}

registerCommands().catch((err) => {
  logger.error({ err }, "Command registration failed");
  process.exit(1);
});
