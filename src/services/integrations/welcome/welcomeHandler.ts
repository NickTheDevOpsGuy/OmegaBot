// src/services/welcome/welcomeHandler.ts

import type { Guild, GuildMember, TextBasedChannel } from "discord.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../utils/logger.js";
import { buildWelcomeMessage } from "./welcomeMessage.js";
import { getGuildConfig } from "../../core/config/index.js";

export type WelcomeMessageResult =
  | { sent: true; channelId: string | null }
  | { sent: false; reason: "disabled" | "no-channel" | "not-sendable" };

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
 * Resolve the best channel to post onboarding messages.
 *
 * Order:
 * 1) Guild config (welcomeEnabled / welcomeChannelId)
 * 2) Guild system channel
 * 3) First available text-based channel
 */
async function resolveWelcomeChannel(guild: Guild): Promise<TextBasedChannel | null> {
  const cfg = await getGuildConfig(guild.id);

  // Allow per-guild disabling of welcome messages.
  if (!cfg.welcomeEnabled) {
    logger.info({ guildId: guild.id }, "[welcome] skipped; welcome disabled");
    return null;
  }

  // Prefer configured welcome channel.
  if (cfg.welcomeChannelId) {
    const ch = await guild.channels.fetch(cfg.welcomeChannelId).catch((): null => null);
    if (ch?.isTextBased()) {
      logger.debug(
        { guildId: guild.id, channelId: cfg.welcomeChannelId },
        "[welcome] using configured channel",
      );
      return ch;
    }

    logger.warn(
      { guildId: guild.id, channelId: cfg.welcomeChannelId },
      "[welcome] configured channel missing or not text-based; falling back",
    );
  }

  // Environment fallback for single-server deployments.
  if (env.discordWelcomeChannelId) {
    const ch = await guild.channels
      .fetch(env.discordWelcomeChannelId)
      .catch((): null => null);
    if (ch?.isTextBased()) {
      logger.debug(
        { guildId: guild.id, channelId: env.discordWelcomeChannelId },
        "[welcome] using env channel",
      );
      return ch;
    }

    logger.warn(
      { guildId: guild.id, channelId: env.discordWelcomeChannelId },
      "[welcome] env channel missing or not text-based; falling back",
    );
  }

  // Fallback to system channel.
  if (guild.systemChannel?.isTextBased()) {
    logger.debug(
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
      logger.debug(
        { guildId: guild.id, channelId: ch.id },
        "[welcome] using first text-based channel",
      );
      return ch;
    }
  }

  return null;
}

function getChannelId(channel: TextBasedChannel): string | null {
  return "id" in channel && typeof channel.id === "string" ? channel.id : null;
}

export async function sendWelcomeMessageForMember(
  member: GuildMember,
  source: "join" | "config-test" = "join",
): Promise<WelcomeMessageResult> {
  const channel = await resolveWelcomeChannel(member.guild);

  if (!channel) {
    logger.info(
      { guildId: member.guild.id, source },
      "Welcome handler skipped (no channel resolved or disabled)",
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
  await channel.send(buildWelcomeMessage(member));
  logger.info(
    { guildId: member.guild.id, userId: member.user.id, channelId, source },
    "[welcome] welcome message sent",
  );

  return { sent: true, channelId };
}

/**
 * Event handler for new members joining a guild.
 * Never throws — background event safety.
 */
export async function onGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    await sendWelcomeMessageForMember(member, "join");
  } catch (err) {
    logger.error(
      { err, guildId: member.guild.id, userId: member.user.id },
      "[welcome] welcome handler threw",
    );
  }
}
