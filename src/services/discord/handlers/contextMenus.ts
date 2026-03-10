import type {
  UserContextMenuCommandInteraction,
  MessageContextMenuCommandInteraction,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../interaction/interactionErrors.js";
import { commandsExecutedTotal } from "../../metrics/server.js";
import type { CommandClient } from "../commandLoader.js";

async function safeRepliableReply(
  interaction: UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction,
  content: string,
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(content);
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  } catch (err) {
    if (isKnownInteractionError(err)) {
      logKnownInteractionError(err, "contextMenu.safeReply", {
        interactionId: interaction.id,
      });
      return;
    }
    logger.warn({ err, interactionId: interaction.id }, "[interaction] failed to reply");
  }
}

export async function handleUserContextMenu(
  interaction: UserContextMenuCommandInteraction,
  client: CommandClient,
): Promise<void> {
  const cmd = client.commands.get(interaction.commandName);
  if (
    cmd &&
    typeof (cmd as { execute?: (i: unknown) => Promise<void> }).execute === "function"
  ) {
    try {
      await (
        cmd as unknown as { execute: (i: typeof interaction) => Promise<void> }
      ).execute(interaction);
      commandsExecutedTotal.inc({ command: interaction.commandName });
    } catch (err) {
      if (isKnownInteractionError(err)) {
        logKnownInteractionError(err, "contextMenu.execute", {
          interactionId: interaction.id,
          command: interaction.commandName,
        });
        return;
      }
      logger.error(
        { err, command: interaction.commandName },
        "[interaction] context menu failed",
      );
      await safeRepliableReply(interaction, "Something went wrong. Try again later.");
    }
  }
}

export async function handleMessageContextMenu(
  interaction: MessageContextMenuCommandInteraction,
  client: CommandClient,
): Promise<void> {
  const cmd = client.commands.get(interaction.commandName);
  if (
    cmd &&
    typeof (cmd as { execute?: (i: unknown) => Promise<void> }).execute === "function"
  ) {
    try {
      await (
        cmd as unknown as { execute: (i: typeof interaction) => Promise<void> }
      ).execute(interaction);
      commandsExecutedTotal.inc({ command: interaction.commandName });
    } catch (err) {
      if (isKnownInteractionError(err)) {
        logKnownInteractionError(err, "contextMenu.execute", {
          interactionId: interaction.id,
          command: interaction.commandName,
        });
        return;
      }
      logger.error(
        { err, command: interaction.commandName },
        "[interaction] context menu failed",
      );
      await safeRepliableReply(interaction, "Something went wrong. Try again later.");
    }
  }
}
