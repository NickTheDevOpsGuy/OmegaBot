// src/services/welcome/welcomeHandler.ts

import type {
  Guild,
  GuildMember,
  TextChannel,
  NewsChannel,
  ThreadChannel,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { buildWelcomeMessage } from "./welcomeMessage.js";

/**
 * Channels we can safely call `.send()` on in a guild context.
 *
 * Note:
 * `TextBasedChannel` is broader and can include DM-ish channel types where
 * `.send()` is not guaranteed in the type system.
 */
type SendableGuildChannel = TextChannel | NewsChannel | ThreadChannel;

/**
 * Resolve the best channel to post onboarding messages.
 *
 * Order:
 * 1) WELCOME_CHANNEL_ID (if set)
 * 2) Guild system channel (if set)
 * 3) First writable guild text channel we can find
 */
async function resolveWelcomeChannel(
  guild: Guild,
): Promise<SendableGuildChannel | null> {
  const envChannelId = process.env.WELCOME_CHANNEL_ID;

  if (envChannelId) {
    const ch = await guild.channels.fetch(envChannelId).catch(() => null);

    if (ch && ch.isTextBased() && "send" in ch) {
      return ch as SendableGuildChannel;
    }
  }

  const system = guild.systemChannel;
  if (system && system.isTextBased() && "send" in system) {
    return system as SendableGuildChannel;
  }

  const channels = await guild.channels.fetch().catch(() => null);
  if (!channels) return null;

  for (const [, ch] of channels) {
    if (!ch) continue;

    // We only want channels that can accept .send()
    if (ch.isTextBased() && "send" in ch) {
      return ch as SendableGuildChannel;
    }
  }

  return null;
}

/**
 * Event handler for new members joining a guild.
 * Never throws: this is a background event path.
 */
export async function onGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const channel = await resolveWelcomeChannel(member.guild);

    if (!channel) {
      logger.warn(
        { guildId: member.guild.id },
        "Welcome handler could not find a sendable channel",
      );
      return;
    }

    await channel.send(buildWelcomeMessage(member));
  } catch (err) {
    logger.error(
      { err, guildId: member.guild.id, userId: member.user.id },
      "Welcome handler failed",
    );
  }
}