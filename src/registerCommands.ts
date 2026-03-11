// src/registerCommands.ts

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { REST, Routes } from "discord.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

/**
 * Shape command modules must export.
 * Supports both SlashCommandBuilder and ContextMenuCommandBuilder.
 */
type CommandModule = {
  data: { toJSON: () => Record<string, unknown>; name?: string };
};

type CommandJson = Record<string, unknown>;

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
    const name = typeof cmd.name === "string" ? cmd.name.trim() : "";
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

  // Structure: dist/commands/<group>/<name>/<name>.js (group = core, games, social, other)
  const groups = readCommandFolders(commandsPath);
  const commands: CommandJson[] = [];

  for (const group of groups) {
    const groupPath = path.join(commandsPath, group);
    const names = readCommandFolders(groupPath);

    for (const name of names) {
      const file = path.join(groupPath, name, `${name}.js`);
      const relFile = path.relative(process.cwd(), file).replaceAll("\\", "/");

      if (!fs.existsSync(file)) {
        logger.debug(
          { group, name, file: relFile },
          "[register] skip (missing entry file)",
        );
        continue;
      }

      try {
        const moduleUrl = pathToFileURL(file).href;
        const imported = (await import(moduleUrl)) as Partial<CommandModule>;

        if (
          !imported.data ||
          typeof (imported.data as { toJSON?: unknown }).toJSON !== "function"
        ) {
          logger.warn(
            { group, name, file: relFile },
            "[register] skip (missing exported data)",
          );
          continue;
        }

        const json = (imported.data as { toJSON: () => CommandJson }).toJSON();

        commands.push(json);
        const cmdName = (imported.data as { name?: string }).name ?? json.name ?? name;
        logger.info({ command: cmdName, file: relFile }, "[register] prepared");
      } catch (err) {
        logger.warn({ err, group, name, file: relFile }, "[register] command module load threw");
      }
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

    const verified = await rest.get(
      Routes.applicationGuildCommands(env.appId, env.guildId),
    );
    const actual = Array.isArray(verified) ? verified.length : 0;
    if (actual !== unique.length) {
      logger.warn(
        { expected: unique.length, actual },
        "[register] sanity check: command count mismatch",
      );
    } else {
      logger.info("[register] sanity check passed");
    }
  } else {
    await rest.put(Routes.applicationCommands(env.appId), {
      body: unique,
    });

    logger.info({ count: unique.length }, "[register] global commands registered");

    const verified = await rest.get(Routes.applicationCommands(env.appId));
    const actual = Array.isArray(verified) ? verified.length : 0;
    if (actual !== unique.length) {
      logger.warn(
        { expected: unique.length, actual },
        "[register] sanity check: command count mismatch",
      );
    } else {
      logger.info("[register] sanity check passed");
    }
  }
}

registerCommands().catch((err) => {
  logger.error({ err }, "[register] Discord API command registration threw");
  process.exit(1);
});
