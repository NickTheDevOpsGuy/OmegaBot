import fs from "fs";
import path from "path";
import {
  Client,
  type ChatInputCommandInteraction,
  type SlashCommandBuilder
} from "discord.js";

export interface SlashCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export type CommandClient = Client & {
  commands: Map<string, SlashCommand>;
};

export async function loadCommands(client: CommandClient): Promise<void> {
  const basePath = path.join(process.cwd(), "src/commands");
  const groups = fs.readdirSync(basePath);

  for (const group of groups) {
    const groupPath = path.join(basePath, group);
    if (!fs.statSync(groupPath).isDirectory()) continue;

    const files = fs.readdirSync(groupPath);
    for (const file of files) {
      if (!file.endsWith(".js")) continue;

      const fullPath = path.join(groupPath, file);
      const mod = (await import(fullPath)) as Partial<SlashCommand>;

      if (mod.data && mod.execute) {
        client.commands.set(mod.data.name, mod as SlashCommand);
      }
    }
  }
}
