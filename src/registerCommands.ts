// src/registerCommands.ts
import fs from "fs";
import path from "path";
import { REST, Routes } from "discord.js";
import { logger } from "./utils/logger.js";

const commands: any[] = [];

const commandsPath = path.join(process.cwd(), "dist", "commands");

/**
 * Recursively walk a directory and return all file paths
 */
function walk(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((file) => {
    const fullPath = path.join(dir, file);
    return fs.statSync(fullPath).isDirectory()
      ? walk(fullPath)
      : [fullPath];
  });
}

for (const file of walk(commandsPath)) {
  if (!file.endsWith(".js")) continue;

  const command = await import(file);
  if (!command?.data) continue;

  commands.push(command.data.toJSON());
  logger.info(
    { command: command.data.name, file },
    "[register] command loaded",
  );
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    logger.info(`[register] registering ${commands.length} commands`);

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_APP_ID!),
      { body: commands },
    );

    logger.info("[register] commands registered successfully");
  } catch (error) {
    logger.error({ error }, "[register] failed to register commands");
  }
})();