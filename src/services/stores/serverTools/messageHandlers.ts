import type { Client } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { handleAutomodMessage } from "./automodHandler.js";
import { handleCustomCommandMessage } from "./customCommandHandler.js";

export function setupServerToolsMessageHandler(client: Client): void {
  client.on("messageCreate", async (message) => {
    try {
      const removed = await handleAutomodMessage(message);
      if (removed) return;
      await handleCustomCommandMessage(message);
    } catch (err) {
      logger.warn({ err, guildId: message.guildId }, "[server-tools] handler threw");
    }
  });

  logger.info("[server-tools] automod and custom command handlers enabled");
}
