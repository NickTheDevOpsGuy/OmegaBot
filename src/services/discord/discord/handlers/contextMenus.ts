import type {
  UserContextMenuCommandInteraction,
  MessageContextMenuCommandInteraction,
} from "discord.js";
import { getContextLogger } from "../../../core/logging/requestContext.js";
import { errMessage, getUserFacingReason } from "../../../../utils/errors.js";
import {
  isKnownInteractionError,
  logKnownInteractionError,
} from "../interaction/interactionErrors.js";
import { commandsExecutedTotal } from "../../../core/metrics/server.js";
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
    getContextLogger().warn(
      { err, interactionId: interaction.id },
      `[interaction] context menu reply threw: ${errMessage(err)}`,
    );
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
      getContextLogger().error(
        { err, command: interaction.commandName },
        `[interaction] context menu threw: ${errMessage(err)}`,
      );
      await safeRepliableReply(interaction, `❌ ${getUserFacingReason(err)}`);
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
      getContextLogger().error(
        { err, command: interaction.commandName },
        `[interaction] context menu threw: ${errMessage(err)}`,
      );
      await safeRepliableReply(interaction, `❌ ${getUserFacingReason(err)}`);
    }
  }
}
