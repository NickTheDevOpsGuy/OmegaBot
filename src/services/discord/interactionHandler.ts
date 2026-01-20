// src/services/discord/interactionHandler.ts
import type {
  ChatInputCommandInteraction,
  Interaction,
  RepliableInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import type { CommandClient } from "./commandLoader.js";
import type { OmegaCommand } from "./commandTypes.js";

function isOmegaCommand(x: unknown): x is OmegaCommand {
  if (!x || typeof x !== "object") return false;

  const obj = x as Record<string, unknown>;
  return typeof obj.execute === "function" && obj.data != null;
}

export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient,
): Promise<void> {
  try {
    // We only handle chat input slash commands here
    if (!interaction.isChatInputCommand()) return;

    const cmdName = interaction.commandName;

    const raw = client.commands.get(cmdName);
    if (!isOmegaCommand(raw)) {
      logger.warn({ cmdName }, "Command not found or invalid command module");
      await safeRepliableReply(
        interaction,
        "Command not found. If this seems wrong, re-run the register script.",
        true,
      );
      return;
    }

    await raw.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    logger.error({ err }, "Interaction handler error");

    if (interaction.isRepliable()) {
      await safeRepliableReply(
        interaction,
        "Something went wrong while running that command.",
        true,
      );
    }
  }
}

async function safeRepliableReply(
  interaction: RepliableInteraction,
  content: string,
  ephemeral: boolean,
): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content, ephemeral });
    return;
  }

  await interaction.reply({ content, ephemeral });
}
