// src/services/welcome/welcomeHandler.ts

import type { Guild, GuildMember, TextBasedChannel } from "discord.js";
import { logger } from "../../utils/logger.js";
import { buildWelcomeMessage } from "./welcomeMessage.js";
import { getGuildConfig } from "../config/index.js";

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
  const cfg = getGuildConfig(guild.id);

  // Allow per-guild disabling of welcome messages.
  if (!cfg.welcomeEnabled) return null;

  // Prefer configured welcome channel.
  if (cfg.welcomeChannelId) {
    const ch = await guild.channels.fetch(cfg.welcomeChannelId).catch(() => null);
    if (ch?.isTextBased()) return ch;
  }

  // Fallback to system channel.
  if (guild.systemChannel?.isTextBased()) {
    return guild.systemChannel;
  }

  // Final fallback: first text-based channel found.
  const channels = await guild.channels.fetch().catch(() => null);
  if (!channels) return null;

  for (const [, ch] of channels) {
    if (ch?.isTextBased()) return ch;
  }

  return null;
}

/**
 * Event handler for new members joining a guild.
 * Never throws — background event safety.
 */
export async function onGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const channel = await resolveWelcomeChannel(member.guild);

    if (!channel) {
      logger.info(
        { guildId: member.guild.id },
        "Welcome handler skipped (no channel resolved or disabled)",
      );
      return;
    }

    if (!isSendableChannel(channel)) {
      logger.warn(
        { guildId: member.guild.id },
        "Resolved welcome channel is not sendable",
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
