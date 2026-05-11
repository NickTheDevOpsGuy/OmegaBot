// src/services/welcome/welcomeHandler.ts

import {
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type TextBasedChannel,
} from "discord.js";
import { env } from "../../../config/env.js";
import { getDiscordErrorCode } from "../../discord/discord/interaction/interactionErrors.js";
import { logger } from "../../../utils/logger.js";
import { buildWelcomeMessage } from "./welcomeMessage.js";
import { getGuildConfig } from "../../core/config/index.js";
import type { GuildConfig } from "../../core/config/index.js";

export type WelcomeMessageResult =
  | { sent: true; channelId: string | null }
  | {
      sent: false;
      reason:
        | "disabled"
        | "no-channel"
        | "not-sendable"
        | "missing-access"
        | "missing-permissions"
        | "send-failed";
      channelId?: string | null;
      missingPermissions?: string[];
    };

/**
 * Type guard to ensure a text-based channel supports `.send()`.
 *
 * This avoids `any` and satisfies ESLint while keeping runtime safety.
 */
function isSendableChannel(
  channel: TextBasedChannel,
): channel is TextBasedChannel & { send: (content: unknown) => Promise<unknown> } {
  return typeof (channel as { send?: unknown }).send === "function";
}

/**
 * Resolve an unconfigured fallback channel to post onboarding messages.
 *
 * Order:
 * 1) Guild system channel
 * 2) First available text-based channel
 */
async function resolveWelcomeChannel(
  guild: Guild,
  cfg: GuildConfig,
): Promise<TextBasedChannel | null> {
  // Allow per-guild disabling of welcome messages.
  if (!cfg.welcomeEnabled) {
    logger.info({ guildId: guild.id }, "[welcome] skipped; welcome disabled");
    return null;
  }

  // Fallback to system channel.
  if (guild.systemChannel?.isTextBased()) {
    logger.info(
      { guildId: guild.id, channelId: guild.systemChannel.id },
      "[welcome] using system channel",
    );
    return guild.systemChannel;
  }

  // Final fallback: first text-based channel found.
  const channels = await guild.channels.fetch().catch((): null => null);
  if (!channels) return null;

  for (const [, ch] of channels) {
    if (ch?.isTextBased()) {
      logger.info(
        { guildId: guild.id, channelId: ch.id },
        "[welcome] using first text-based channel",
      );
      return ch;
    }
  }

  return null;
}

async function fetchWelcomeChannel(
  guild: Guild,
  channelId: string,
  source: "guild-config" | "env",
): Promise<TextBasedChannel | null> {
  try {
    const channel = await guild.channels.fetch(channelId);
    if (channel?.isTextBased()) {
      logger.info(
        { guildId: guild.id, channelId, source },
        "[welcome] resolved welcome channel",
      );
      return channel;
    }

    logger.warn(
      {
        guildId: guild.id,
        channelId,
        source,
        channelType: channel?.type ?? null,
      },
      "[welcome] configured welcome channel missing or not text-based",
    );
  } catch (err) {
    const code = getDiscordErrorCode(err);
    logger.warn(
      { err, code, guildId: guild.id, channelId, source },
      "[welcome] failed to fetch configured welcome channel",
    );
  }

  return null;
}

function getChannelId(channel: TextBasedChannel): string | null {
  return "id" in channel && typeof channel.id === "string" ? channel.id : null;
}

function missingSendPermissions(
  member: GuildMember,
  channel: TextBasedChannel,
): string[] {
  if (!("permissionsFor" in channel) || typeof channel.permissionsFor !== "function") {
    return [];
  }

  const permissions = channel.permissionsFor(
    member.guild.members.me ?? member.client.user,
  );
  if (!permissions) return ["View Channel", "Send Messages"];

  return [
    permissions.has(PermissionFlagsBits.ViewChannel) ? null : "View Channel",
    permissions.has(PermissionFlagsBits.SendMessages) ? null : "Send Messages",
  ].filter((permission): permission is string => Boolean(permission));
}

export async function sendWelcomeMessageForMember(
  member: GuildMember,
  source: "join" | "config-test" = "join",
): Promise<WelcomeMessageResult> {
  const cfg = await getGuildConfig(member.guild.id);
  if (!cfg.welcomeEnabled) {
    logger.info(
      { guildId: member.guild.id, userId: member.user.id, source },
      "[welcome] skipped; welcome disabled",
    );
    return { sent: false, reason: "disabled" };
  }

  let channel: TextBasedChannel | null = null;

  if (cfg.welcomeChannelId) {
    channel = await fetchWelcomeChannel(
      member.guild,
      cfg.welcomeChannelId,
      "guild-config",
    );
  }

  if (!channel && env.discordWelcomeChannelId) {
    channel = await fetchWelcomeChannel(
      member.guild,
      env.discordWelcomeChannelId,
      "env",
    );
  }

  if (!channel) {
    channel = await resolveWelcomeChannel(member.guild, cfg);
  }

  if (!channel) {
    logger.warn(
      { guildId: member.guild.id, userId: member.user.id, source },
      "[welcome] skipped; no welcome channel resolved",
    );
    return { sent: false, reason: "no-channel" };
  }

  if (!isSendableChannel(channel)) {
    logger.warn(
      { guildId: member.guild.id, channelId: getChannelId(channel), source },
      "Resolved welcome channel is not sendable",
    );
    return { sent: false, reason: "not-sendable" };
  }

  const channelId = getChannelId(channel);
  const missingPermissions = missingSendPermissions(member, channel);
  if (missingPermissions.length > 0) {
    logger.warn(
      {
        guildId: member.guild.id,
        userId: member.user.id,
        channelId,
        source,
        missingPermissions,
      },
      "[welcome] missing channel permissions for welcome message",
    );
    return {
      sent: false,
      reason: "missing-permissions",
      channelId,
      missingPermissions,
    };
  }

  try {
    await channel.send(buildWelcomeMessage(member, cfg.welcomeMessage));
    logger.info(
      { guildId: member.guild.id, userId: member.user.id, channelId, source },
      "[welcome] welcome message sent",
    );
  } catch (err) {
    const code = getDiscordErrorCode(err);
    const reason =
      code === 50001
        ? "missing-access"
        : code === 50013
          ? "missing-permissions"
          : "send-failed";

    logger.warn(
      {
        err,
        code,
        reason,
        guildId: member.guild.id,
        userId: member.user.id,
        channelId,
        source,
      },
      "[welcome] welcome message send failed",
    );

    return { sent: false, reason, channelId };
  }

  return { sent: true, channelId };
}

/**
 * Event handler for new members joining a guild.
 * Never throws — background event safety.
 */
export async function onGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const result = await sendWelcomeMessageForMember(member, "join");
    if (!result.sent) {
      logger.warn(
        {
          guildId: member.guild.id,
          userId: member.user.id,
          reason: result.reason,
          channelId: result.channelId ?? null,
          missingPermissions: result.missingPermissions,
        },
        "[welcome] member joined but welcome message was not sent",
      );
    }
  } catch (err) {
    logger.error(
      { err, guildId: member.guild.id, userId: member.user.id },
      "[welcome] welcome handler threw",
    );
  }
}
