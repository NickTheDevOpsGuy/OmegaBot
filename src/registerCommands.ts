import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { env } from "./config/env.js";

/*
 * Load all compiled command JSON definitions from dist/commands and prepare them for registration with Discord.
 */
async function loadCommandData() {
  const commands: any[] = [];
  // Read built JS commands from dist
  const basePath = path.join(process.cwd(), "dist/commands");
  const groups = fs.readdirSync(basePath);

  for (const group of groups) {
    const groupPath = path.join(basePath, group);
    if (!fs.statSync(groupPath).isDirectory()) continue;

    const files = fs.readdirSync(groupPath);
    for (const file of files) {
      if (!file.endsWith(".js")) continue;
      const mod = await import(path.join(groupPath, file));
      if (mod.data) commands.push(mod.data.toJSON());
    }
  }
  return commands;
}
/*
 * Register all slash commands with Discord for the configured application and guild.
 */
async function register() {
  const rest = new REST({ version: "10" }).setToken(env.token);
  const commands = await loadCommandData();

  /*
   * Replace all existing guild slash commands with the freshly built definitions.
   */
  await rest.put(Routes.applicationGuildCommands(env.appId, env.guildId), {
    body: commands,
  });

  console.log("Commands registered");
}

/*
 * Report failures clearly and exit with a non-zero status.
 */
register().catch((err) => {
  console.error("Failed to register commands:", err);
  process.exit(1);
});
