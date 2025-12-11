import fs from "fs";
import path from "path";
import {
  Client,
  type ChatInputCommandInteraction,
  type SlashCommandBuilder,
} from "discord.js";

/**
 * Contract that every slash command module must follow.
 *
 * - `data` describes the command to Discord (name, description, options)
 *   using SlashCommandBuilder.
 * - `execute` is the handler that runs when a user invokes the command.
 */
export interface SlashCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * Extension of the Discord Client that includes a `commands` map.
 *
 * This lets us:
 * - dynamically load commands at startup
 * - look up the correct handler at runtime by command name
 *   (e.g. "ping" -> ping command module)
 */
export type CommandClient = Client & {
  commands: Map<string, SlashCommand>;
};

/**
 * Dynamically loads all compiled command modules and registers them on the client.
 *
 * How it works:
 * - Looks under dist/commands for grouped command folders (e.g. general/, summary/)
 * - Imports every .js file in those folders at runtime
 * - Expects each module to export `data` and `execute` matching the SlashCommand interface
 * - Registers each command into `client.commands` keyed by its name
 *
 * This allows new commands to be added simply by dropping a new file in src/commands,
 * then rebuilding the project.
 */
export async function loadCommands(client: CommandClient): Promise<void> {
  // We run the bot from compiled JS, so commands are discovered in dist/commands,
  // not src/commands.
  const basePath = path.join(process.cwd(), "dist/commands");
  const groups = fs.readdirSync(basePath);

  // Each "group" is a subfolder under dist/commands (e.g. general/, summary/).
  for (const group of groups) {
    const groupPath = path.join(basePath, group);
    if (!fs.statSync(groupPath).isDirectory()) continue;

    const files = fs.readdirSync(groupPath);
    for (const file of files) {
      // Only consider compiled .js files. Ignore maps, d.ts, etc.
      if (!file.endsWith(".js")) continue;

      const fullPath = path.join(groupPath, file);

      // Dynamically import the command module. We treat it as Partial here
      // and validate that it actually has the expected shape before using it.
      const mod = (await import(fullPath)) as Partial<SlashCommand>;

      // Only register modules that provide both `data` and `execute`.
      // This prevents half-configured or broken command files from crashing the bot.
      if (mod.data && mod.execute) {
        // The command name is defined in `data` (SlashCommandBuilder).
        // We use that as the key in the commands map.
        client.commands.set(mod.data.name, mod as SlashCommand);
      }
    }
  }
}
