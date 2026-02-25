// src/services/discord/interactionHandler.ts
import { performance } from "node:perf_hooks";
import type {
  Interaction,
  RepliableInteraction,
  AutocompleteInteraction,
} from "discord.js";
import { MessageFlags } from "discord.js";
import { logger } from "../../utils/logger.js";
import type { CommandClient } from "./commandLoader.js";
import type { CommandModule } from "./commandTypes.js";
import { handleGiveawayButton } from "../../commands/giveaway/giveaway.js";
import {
  getDiscordErrorCode,
  isKnownInteractionError,
  logKnownInteractionError,
} from "./interactionErrors.js";

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

/**
 * Small helper so "unknown command" logs can suggest the closest registry keys.
 * Not fancy levenshtein, but enough to spot casing/pluralization/old names.
 */
function closestCommandNames(input: string, candidates: string[], max = 5): string[] {
  const needle = input.trim().toLowerCase();
  if (!needle) return [];

  function score(name: string): number {
    const n = name.toLowerCase();

    // exact
    if (n === needle) return 0;

    // starts-with is usually the best hint
    if (n.startsWith(needle) || needle.startsWith(n)) return 1;

    // contains
    if (n.includes(needle) || needle.includes(n)) return 2;

    // cheap distance-ish: length diff + first/last char mismatch
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
  // Autocomplete: respond quickly (≤3s). Commands can export autocomplete handler.
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    const autocomplete =
      command && typeof command === "object" && "autocomplete" in command
        ? (command as { autocomplete?: (i: AutocompleteInteraction) => Promise<void> })
            .autocomplete
        : undefined;
    try {
      if (autocomplete && typeof autocomplete === "function") {
        await autocomplete(interaction);
      } else {
        await interaction.respond([]);
      }
    } catch (err) {
      logger.warn(
        { err, command: interaction.commandName, interactionId: interaction.id },
        "[interaction] autocomplete failed",
      );
      try {
        await interaction.respond([]);
      } catch {
        // ignore
      }
    }
    return;
  }

  // Handle button interactions (giveaways, etc.)
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("giveaway:")) {
      try {
        await handleGiveawayButton(interaction);
      } catch (err) {
        logger.error(
          { err, customId: interaction.customId },
          "[interaction] giveaway button failed",
        );
      }
      return;
    }
    // Other button interactions are handled by their respective collectors
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const start = performance.now();

  const meta = {
    interactionId: interaction.id,
    command: interaction.commandName,
    userId: interaction.user.id,
    username: interaction.user.username,
    guildId: interaction.inGuild() ? interaction.guildId : null,
    channelId: interaction.channelId ?? null,
    // If you ever suspect readiness / partial cache timing issues:
    clientReady: typeof client.isReady === "function" ? client.isReady() : null,
    registrySize: client.commands?.size ?? null,
  };

  // Useful to correlate "command not found" reports to startup/reload timing
  logger.debug(meta, "[interaction] received");

  const commandUnknown = client.commands.get(interaction.commandName);

  if (!commandUnknown) {
    const keys = [...client.commands.keys()];
    const closest = closestCommandNames(interaction.commandName, keys, 6);

    logger.warn(
      {
        ...meta,
        knownCommandsSample: keys.slice(0, 40),
        closest,
      },
      "[interaction] unknown command (not in registry)",
    );

    // You can optionally reply, but many bots choose not to.
    // If you want to tell the user quietly:
    // await safeRepliableReply(interaction, "That command is not available right now. Try again in a moment.", true);
    return;
  }

  if (!isCommandModule(commandUnknown)) {
    logger.error(
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
    // If you want to see what modules are actually being executed:
    logger.debug(
      {
        ...meta,
        moduleName: command.data.name,
        group: command.group ?? null,
        adminOnly: Boolean(command.adminOnly),
      },
      "[interaction] executing",
    );

    await command.execute(interaction);
  } catch (err) {
    if (isKnownInteractionError(err)) {
      logKnownInteractionError(err, "command.execute", meta);
      return;
    }

    const code = getDiscordErrorCode(err);
    const msg = getDiscordErrorMessage(err);

    logger.error({ ...meta, err, code, msg }, "[interaction] command failed");

    const hint =
      code != null ? `Discord error code: ${code}` : msg ? `Error: ${msg}` : null;

    await safeRepliableReply(
      interaction,
      hint
        ? `Something went wrong while running that command.\n${hint}`
        : "Something went wrong while running that command.",
      true,
    );
  } finally {
    const ms = Math.round(performance.now() - start);
    logger.debug({ ...meta, ms }, "[interaction] command timing");
  }
}
