// src/services/discord/commandLoader.ts
import { Client } from "discord.js";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { logger } from "../../utils/logger.js";
import type { CommandModule } from "./commandTypes.js";

/**
 * Client typing: command loader populates this registry.
 */
export type CommandClient = Client & {
  commands: Map<string, CommandModule>;
  reminderScheduler?: { start: () => void; stop: () => void };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function isCommandModule(mod: unknown): mod is CommandModule {
  if (!isRecord(mod)) return false;
  return (
    "data" in mod &&
    "execute" in mod &&
    typeof (mod as { execute?: unknown }).execute === "function"
  );
}

/**
 * Load compiled command modules from /dist.
 * This loader runs at runtime (node), so it imports built JS.
 *
 * Convention:
 * - src/commands/<name>/<name>.ts  -> dist/commands/<name>/<name>.js
 * - Each module exports { data, execute, ... }
 */
export async function loadCommands(client: CommandClient): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // From dist/services/discord -> dist/commands
  const commandsDir = path.resolve(__dirname, "../../commands");

  logger.info({ commandsDir }, "[commands] loading");

  const entries = await readdir(commandsDir, { withFileTypes: true });

  let loaded = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const folder = entry.name;
    const file = path.join(commandsDir, folder, `${folder}.js`);

    try {
      const url = pathToFileURL(file).href;
      const imported = await import(url);

      // Support either default export OR named exports
      const modUnknown = (imported?.default ?? imported) as unknown;

      if (!isCommandModule(modUnknown)) {
        logger.warn(
          { folder, file },
          "[commands] skipped: module does not export { data, execute }",
        );
        continue;
      }

      const command = modUnknown;

      client.commands.set(command.data.name, command);
      loaded++;

      logger.info(
        {
          name: command.data.name,
          adminOnly: Boolean(command.adminOnly),
          group: command.group ?? "other",
        },
        "[commands] loaded",
      );
    } catch (err) {
      logger.error({ err, folder, file }, "[commands] failed to load");
    }
  }

  logger.info(
    { loaded, names: [...client.commands.keys()] },
    "[commands] registry ready",
  );
}
