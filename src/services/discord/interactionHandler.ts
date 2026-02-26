// src/services/discord/interactionHandler.ts
import { performance } from "node:perf_hooks";
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
} from "../logging/requestContext.js";
import { t, resolveLocale } from "../../i18n/index.js";
import { MessageFlags } from "discord.js";
import { logger } from "../../utils/logger.js";
import type { CommandClient } from "./commandLoader.js";
import type { CommandModule } from "./commandTypes.js";
import {
  getDiscordErrorCode,
  isKnownInteractionError,
  logKnownInteractionError,
} from "./interactionErrors.js";
import { commandsExecutedTotal } from "../metrics/server.js";
import { recordCommandUsage } from "../analytics/commandUsageStore.js";
import { handleAutocomplete } from "./handlers/autocomplete.js";
import { handleModalSubmit } from "./handlers/modals.js";
import { handleButton } from "./handlers/buttons.js";
import {
  handleUserContextMenu,
  handleMessageContextMenu,
} from "./handlers/contextMenus.js";

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
    logger.warn({ err, interactionId: interaction.id }, "[interaction] failed to reply");
  }
}

export async function handleInteraction(
  interaction: Interaction,
  client: CommandClient,
): Promise<void> {
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

  if (!interaction.isChatInputCommand()) return;

  const start = performance.now();
  const subcommand = interaction.options.getSubcommand(false);
  const ctx = createRequestContext({
    userId: interaction.user.id,
    guildId: interaction.guildId ?? undefined,
    channelId: interaction.channelId,
    command: interaction.commandName,
    subcommand: subcommand ?? undefined,
    meta: {
      interactionId: interaction.id,
      username: interaction.user.username,
      clientReady: typeof client.isReady === "function" ? client.isReady() : null,
      registrySize: client.commands?.size ?? null,
    },
  });

  await runWithContextAsync(ctx, async () => {
    await handleChatCommand(interaction as ChatInputCommandInteraction, client, start);
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
    log.error({ ...meta, err, code, msg }, "[interaction] command failed");

    const hint =
      code != null ? `Discord error code: ${code}` : msg ? `Error: ${msg}` : null;

    const guildLocale = (interaction as { guild?: { preferredLocale?: string } }).guild
      ?.preferredLocale;
    const genericMsg = t("error.generic", resolveLocale(guildLocale));
    await safeRepliableReply(
      interaction,
      hint
        ? `${genericMsg}\n${hint}`
        : genericMsg,
      true,
    );
  } finally {
    const ms = Math.round(performance.now() - start);
    log.debug({ ...meta, ms }, "[interaction] command timing");
  }
}
