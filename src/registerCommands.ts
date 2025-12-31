// src/registerCommands.ts

import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { env } from "./config/env.js";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import { logger } from "./utils/logger.js";

/*
 * Read all compiled command definitions and prepare them for registration
 * with the Discord API.
 *
 * Only registers REAL slash command modules:
 * - must export `data` (SlashCommandBuilder)
 * - must export `execute` (function)
 *
 * Helper files (services.js, store.js, _shared.js, etc.) are skipped.
 */
async function loadCommandData(): Promise<
  RESTPostAPIChatInputApplicationCommandsJSONBody[]
> {
  const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

  const basePath = path.join(process.cwd(), "dist", "commands");

  if (!fs.existsSync(basePath)) {
    logger.warn({ basePath }, "dist/commands not found. Did you run build?");
    return commands;
  }

  const groups = fs.readdirSync(basePath);

  for (const group of groups) {
    const groupPath = path.join(basePath, group);
    if (!fs.statSync(groupPath).isDirectory()) continue;

    const files = fs.readdirSync(groupPath);

    for (const file of files) {
      if (!file.endsWith(".js")) continue;

      const modulePath = path.join(groupPath, file);
      const moduleUrl = pathToFileURL(modulePath).href;

      try {
        const mod = await import(moduleUrl);

        if (mod?.data && typeof mod.execute === "function") {
          const json = mod.data.toJSON();

          // 👇 Log exactly what is being registered
          logger.info(
            {
              command: json.name,
              group,
              file,
            },
            "Registering slash command",
          );

          commands.push(json);
        } else {
          logger.debug(
            { file: `${group}/${file}` },
            "Skipping non-command module (missing data or execute)",
          );
        }
      } catch (err) {
        logger.warn(
          { err, file: `${group}/${file}` },
          "Failed to import command module",
        );
      }
    }
  }

  return commands;
}

/*
 * Register all slash commands with Discord for the configured application.
 *
 * If DISCORD_GUILD_ID is set, we register to that guild (fast iteration).
 * Otherwise we register globally (can take longer to propagate).
 */
async function register(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(env.token);

  const commands = await loadCommandData();

  logger.info(
    {
      count: commands.length,
      commands: commands.map((c) => c.name),
    },
    "Final slash command payload",
  );

  if (env.guildId) {
    await rest.put(Routes.applicationGuildCommands(env.appId, env.guildId), {
      body: commands,
    });

    logger.info({ guildId: env.guildId }, "Commands registered to guild.");
    return;
  }

  await rest.put(Routes.applicationCommands(env.appId), {
    body: commands,
  });

  logger.info("Commands registered globally.");
}

register().catch((err) => {
  logger.error(err, "Failed to register commands");
  process.exit(1);
});