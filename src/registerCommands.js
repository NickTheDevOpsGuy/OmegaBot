import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { env } from "./config/env.js";

async function loadCommandData() {
  const commands = [];
  const basePath = path.join(process.cwd(), "src/commands");
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

async function register() {
  const rest = new REST({ version: "10" }).setToken(env.token);
  const commands = await loadCommandData();

  await rest.put(
    Routes.applicationGuildCommands(env.appId, env.guildId),
    { body: commands }
  );

  console.log("Commands registered");
}

register();
