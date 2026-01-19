// src/registerCommands.ts

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

/**
 * Shape every slash command module must export.
 * This matches commandLoader.ts exactly.
 */
type SlashCommandModule = {
  data: SlashCommandBuilder;
};

/**
 * Recursively walk a directory and return all files.
 */
function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

async function registerCommands(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(env.token);

  const commandsPath = path.join(process.cwd(), "dist", "commands");

  if (!fs.existsSync(commandsPath)) {
    throw new Error(`dist/commands not found. Did you forget to run "npm run build"?`);
  }

  const commandFiles = walkFiles(commandsPath).filter(
    (file) => file.endsWith(".js") && !file.endsWith(".d.ts"),
  );

  const commands: ReturnType<SlashCommandBuilder["toJSON"]>[] = [];

  for (const file of commandFiles) {
    const relFile = path.relative(commandsPath, file).replaceAll("\\", "/");

    try {
      const moduleUrl = pathToFileURL(file).href;
      const imported = (await import(moduleUrl)) as Partial<SlashCommandModule>;

      if (!imported.data) {
        logger.debug({ file: relFile }, "Skipping non-command module (missing data)");
        continue;
      }

      commands.push(imported.data.toJSON());
      logger.info({ command: imported.data.name }, "Prepared command for registration");
    } catch (err) {
      logger.warn({ err, file: relFile }, "Failed to load command for registration");
    }
  }

  if (commands.length === 0) {
    logger.warn("No commands found to register");
    return;
  }

  logger.info({ count: commands.length }, "Registering application (/) commands");

  if (env.guildId) {
    // Guild-scoped (fast refresh, dev-friendly)
    await rest.put(Routes.applicationGuildCommands(env.appId, env.guildId), {
      body: commands,
    });

    logger.info(
      { guildId: env.guildId, count: commands.length },
      "Guild commands registered",
    );
  } else {
    // Global (can take up to 1 hour to propagate)
    await rest.put(Routes.applicationCommands(env.appId), {
      body: commands,
    });

    logger.info({ count: commands.length }, "Global commands registered");
  }
}

registerCommands().catch((err) => {
  logger.error({ err }, "Command registration failed");
  process.exit(1);
});
