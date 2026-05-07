import type { Client, Message } from "discord.js";
import { logger } from "../../../utils/logger.js";
import {
  getCustomCommand,
  incrementCustomCommandUse,
  normalizeCustomCommandName,
} from "./customCommandStore.js";

function renderResponse(template: string, message: Message): string {
  return template
    .replaceAll("{user}", `<@${message.author.id}>`)
    .replaceAll("{username}", message.author.username)
    .replaceAll("{server}", message.guild?.name ?? "this server")
    .replaceAll("{channel}", `<#${message.channel.id}>`);
}

export async function handleCustomCommandMessage(message: Message): Promise<boolean> {
  if (!message.guildId || message.author.bot) return false;
  const content = message.content.trim();
  if (!content.startsWith("!")) return false;

  const [rawName] = content.slice(1).split(/\s+/, 1);
  const name = normalizeCustomCommandName(rawName ?? "");
  if (!name) return false;

  const command = getCustomCommand(message.guildId, name);
  if (!command) return false;

  incrementCustomCommandUse(message.guildId, name);
  await message.reply({
    content: renderResponse(command.response, message),
    allowedMentions: { users: [message.author.id], roles: [] },
  });
  return true;
}

export function setupCustomCommandMessageHandler(client: Client): void {
  client.on("messageCreate", async (message) => {
    await handleCustomCommandMessage(message).catch((err: unknown) => {
      logger.warn({ err, guildId: message.guildId }, "[custom-commands] handler threw");
    });
  });

  logger.info("[custom-commands] bang commands enabled");
}
