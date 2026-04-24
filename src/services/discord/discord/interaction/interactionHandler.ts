// src/services/discord/interaction/interactionHandler.ts
// Routes interactions to commands, autocomplete, modals, buttons, context menus; wraps execute in try/catch.
import { performance } from "node:perf_hooks";
import { hostname } from "node:os";
import type {
  ChatInputCommandInteraction,
  Interaction,
  RepliableInteraction,
} from "discord.js";
import {
  createRequestContext,
  runWithContextAsync,
  getContextLogger,
  getRequestId,
} from "../../../core/logging/requestContext.js";
import { MessageFlags } from "discord.js";
import { errMessage, getUserFacingReason } from "../../../../utils/errors.js";
import type { CommandClient } from "../commandLoader.js";
import type { CommandModule } from "../commandTypes.js";
import {
  getDiscordErrorCode,
  isKnownInteractionError,
  logKnownInteractionError,
} from "./interactionErrors.js";
import { commandsExecutedTotal } from "../../../core/metrics/server.js";
import { recordCommandUsage } from "../../../core/analytics/commandUsageStore.js";
import { handleAutocomplete } from "../handlers/autocomplete.js";
import { handleModalSubmit } from "../handlers/modals.js";
import { handleButton } from "../handlers/buttons.js";
import {
  handleUserContextMenu,
  handleMessageContextMenu,
} from "../handlers/contextMenus.js";

const DISCORD_EPOCH_MS = 1_420_070_400_000;
const PROCESS_HOSTNAME = hostname();

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function getDiscordErrorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  if (isRecord(err)) {
    const msg = err["message"];
    return typeof msg === "string" ? msg : null;
  }
  return null;
}

function isCommandModule(cmd: unknown): cmd is CommandModule {
  return (
    isRecord(cmd) &&
    typeof cmd.execute === "function" &&
    isRecord(cmd.data) &&
    typeof (cmd.data as { name?: unknown }).name === "string"
  );
}

function closestCommandNames(input: string, candidates: string[], max = 5): string[] {
  const needle = input.trim().toLowerCase();
  if (!needle) return [];

  function score(name: string): number {
    const n = name.toLowerCase();
    if (n === needle) return 0;
    if (n.startsWith(needle) || needle.startsWith(n)) return 1;
    if (n.includes(needle) || needle.includes(n)) return 2;
    const len = Math.abs(n.length - needle.length);
    const first = n[0] === needle[0] ? 0 : 1;
    const last = n[n.length - 1] === needle[needle.length - 1] ? 0 : 1;
    return 3 + len + first + last;
  }

  return [...candidates].sort((a, b) => score(a) - score(b)).slice(0, max);
}

function getInteractionKind(interaction: Interaction): string {
  if (interaction.isChatInputCommand()) return "chat_input";
  if (interaction.isAutocomplete()) return "autocomplete";
  if (interaction.isModalSubmit()) return "modal_submit";
  if (interaction.isButton()) return "button";
  if (interaction.isUserContextMenuCommand()) return "user_context_menu";
  if (interaction.isMessageContextMenuCommand()) return "message_context_menu";
  return "other";
}

function getInteractionCommand(interaction: Interaction): string | undefined {
  if (
    interaction.isChatInputCommand() ||
    interaction.isAutocomplete() ||
    interaction.isUserContextMenuCommand() ||
    interaction.isMessageContextMenuCommand()
  ) {
    return interaction.commandName;
  }
  if (interaction.isButton()) return "button";
  if (interaction.isModalSubmit()) return "modal";
  return undefined;
}

function getInteractionSubcommand(interaction: Interaction): string | undefined {
  if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
    return interaction.options.getSubcommand(false) ?? undefined;
  }
  if (interaction.isButton() || interaction.isModalSubmit()) {
    return interaction.customId.split(":")[0]?.slice(0, 64) || undefined;
  }
  return undefined;
}

function getInteractionChannelId(interaction: Interaction): string | undefined {
  return "channelId" in interaction && typeof interaction.channelId === "string"
    ? interaction.channelId
    : undefined;
}

function getInteractionCreatedAtMs(interactionId: string): number | null {
  try {
    return Number((BigInt(interactionId) >> 22n) + BigInt(DISCORD_EPOCH_MS));
  } catch {
    return null;
  }
}

function getInteractionAgeMs(interaction: Interaction): number | null {
  const createdAtMs = getInteractionCreatedAtMs(interaction.id);
  return createdAtMs === null ? null : Date.now() - createdAtMs;
}

function getInteractionDiagnostics(interaction: Interaction): Record<string, unknown> {
  return {
    applicationId:
      "applicationId" in interaction && typeof interaction.applicationId === "string"
        ? interaction.applicationId
        : null,
    acknowledged:
      "deferred" in interaction || "replied" in interaction
        ? {
            deferred: "deferred" in interaction ? Boolean(interaction.deferred) : null,
            replied: "replied" in interaction ? Boolean(interaction.replied) : null,
          }
        : null,
  };
}

async function safeRepliableReply(
  interaction: RepliableInteraction,
  content: string,
  ephemeral = true,
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(content);
    } else {
      await interaction.reply({
        content,
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    }
  } catch (err) {
    if (isKnownInteractionError(err)) {
      logKnownInteractionError(err, "safeRepliableReply", {
        interactionId: interaction.id,
      });
      return;
    }
    getContextLogger().warn(
      { err, interactionId: interaction.id },
      `[interaction] slash command reply threw: ${errMessage(err)}`,
    );
  }
}

/**
 * Main entry for all Discord interactions. Dispatches to the appropriate handler
 * (autocomplete, modal, button, context menu, or slash command), wraps command
 * execution in try/catch, and sends a generic error message on failure.
 * @param interaction - The incoming interaction from Discord.
 * @param client - The command client (registry of slash commands and metadata).
 */
export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient,
): Promise<void> {
  const supportedInteraction =
    interaction.isAutocomplete() ||
    interaction.isModalSubmit() ||
    interaction.isButton() ||
    interaction.isUserContextMenuCommand() ||
    interaction.isMessageContextMenuCommand() ||
    interaction.isChatInputCommand();

  if (!supportedInteraction) return;

  const start = interaction.isChatInputCommand() ? performance.now() : null;
  const subcommand = getInteractionSubcommand(interaction);
  const ctx = createRequestContext({
    userId: interaction.user.id,
    guildId: interaction.guildId ?? undefined,
    channelId: getInteractionChannelId(interaction),
    command: getInteractionCommand(interaction),
    subcommand: subcommand ?? undefined,
    meta: {
      interactionId: interaction.id,
      interactionType: getInteractionKind(interaction),
      username: interaction.user.username,
      customId:
        interaction.isButton() || interaction.isModalSubmit()
          ? interaction.customId
          : null,
      clientReady: typeof client.isReady === "function" ? client.isReady() : null,
      registrySize: client.commands?.size ?? null,
      interactionAgeMs: getInteractionAgeMs(interaction),
      pid: process.pid,
      hostname: PROCESS_HOSTNAME,
      ...getInteractionDiagnostics(interaction),
    },
  });

  await runWithContextAsync(ctx, async () => {
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction, client);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isUserContextMenuCommand()) {
      await handleUserContextMenu(interaction, client);
      return;
    }

    if (interaction.isMessageContextMenuCommand()) {
      await handleMessageContextMenu(interaction, client);
      return;
    }

    if (!interaction.isChatInputCommand() || start == null) return;
    await handleChatCommand(interaction, client, start);
  });
}

async function handleChatCommand(
  interaction: ChatInputCommandInteraction,
  client: CommandClient,
  start: number,
): Promise<void> {
  const log = getContextLogger();
  const meta = {
    interactionId: interaction.id,
    command: interaction.commandName,
    userId: interaction.user.id,
    username: interaction.user.username,
    guildId: interaction.inGuild() ? interaction.guildId : null,
    channelId: interaction.channelId ?? null,
    clientReady: typeof client.isReady === "function" ? client.isReady() : null,
    registrySize: client.commands?.size ?? null,
    interactionAgeMs: getInteractionAgeMs(interaction),
    pid: process.pid,
    hostname: PROCESS_HOSTNAME,
    ...getInteractionDiagnostics(interaction),
  };

  log.debug(meta, "[interaction] received");

  const commandUnknown = client.commands.get(interaction.commandName);

  if (!commandUnknown) {
    const keys = [...client.commands.keys()];
    const closest = closestCommandNames(interaction.commandName, keys, 6);
    log.warn(
      { ...meta, knownCommandsSample: keys.slice(0, 40), closest },
      "[interaction] unknown command (not in registry)",
    );
    await safeRepliableReply(
      interaction,
      "That command isn't available right now. It may have been updated or disabled. Try `/help` or ask an admin to re-sync commands.",
      true,
    );
    return;
  }

  if (!isCommandModule(commandUnknown)) {
    log.error(
      {
        ...meta,
        foundType: typeof commandUnknown,
        foundKeys: isRecord(commandUnknown) ? Object.keys(commandUnknown) : null,
      },
      "[interaction] invalid command module shape",
    );
    await safeRepliableReply(
      interaction,
      "That command is misconfigured on the bot. Tell an admin to check logs.",
      true,
    );
    return;
  }

  const command = commandUnknown;

  try {
    log.debug(
      {
        ...meta,
        moduleName: command.data.name,
        group: command.group ?? null,
        adminOnly: Boolean(command.adminOnly),
      },
      "[interaction] executing",
    );

    await command.execute(interaction);
    commandsExecutedTotal.inc({ command: command.data.name });
    recordCommandUsage(interaction.user.id, command.data.name);
  } catch (err) {
    if (isKnownInteractionError(err)) {
      logKnownInteractionError(err, "command.execute", {
        ...meta,
        requestId: getRequestId(),
      });
      return;
    }

    const code = getDiscordErrorCode(err);
    const msg = getDiscordErrorMessage(err);
    log.error(
      { ...meta, err, code, msg },
      `[interaction] command execution threw: ${errMessage(err)}`,
    );

    const userMsg = getUserFacingReason(err);
    await safeRepliableReply(interaction, `❌ ${userMsg}`, true);
  } finally {
    const ms = Math.round(performance.now() - start);
    log.debug({ ...meta, ms }, "[interaction] command timing");
  }
}
