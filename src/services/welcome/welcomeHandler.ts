// src/services/welcome/welcomeHandler.ts

import type { Guild, GuildMember, TextBasedChannel } from "discord.js";
import { logger } from "../../utils/logger.js";
import { buildWelcomeMessage } from "./welcomeMessage.js";
import { getGuildConfig } from "../config/guildConfigStore.js";

/**
 * Narrow a text-based channel into a "sendable" channel.
 *
 * discord.js typings include some text-based channel variants where `send`
 * may not exist (ex: PartialGroupDMChannel). This guard keeps TypeScript happy
 * and prevents runtime surprises.
 */
function isSendableTextChannel(
  ch: TextBasedChannel,
): ch is TextBasedChannel & { send: (content: unknown) => Promise<unknown> } {
  return "send" in ch && typeof (ch as any).send === "function";
}

/**
 * Resolve the best channel to post onboarding messages.
 *
 * Order:
 * 1) Guild config: welcomeEnabled/welcomeChannelId
 * 2) Guild system channel (if set)
 * 3) First text-based channel we can find
 */
async function resolveWelcomeChannel(guild: Guild): Promise<TextBasedChannel | null> {
  // Pull per-guild configuration (defaults applied automatically).
  const cfg = getGuildConfig(guild.id);

  // Allow guilds to disable welcome messages entirely.
  if (!cfg.welcomeEnabled) return null;

  // If configured, try that channel first.
  if (cfg.welcomeChannelId) {
    const ch = await guild.channels.fetch(cfg.welcomeChannelId).catch(() => null);
    if (ch && ch.isTextBased()) return ch;
  }

  // Next best: guild "system channel" (if present).
  if (guild.systemChannel && guild.systemChannel.isTextBased()) {
    return guild.systemChannel;
  }

  // Fallback: first text-based channel we can find.
  const channels = await guild.channels.fetch().catch(() => null);
  if (!channels) return null;

  for (const [, ch] of channels) {
    if (!ch) continue;
    if (!ch.isTextBased()) continue;
    return ch;
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
      logger.info(
        { guildId: member.guild.id },
        "Welcome handler skipped (no channel resolved or welcomes disabled)",
      );
      return;
    }

    // Extra runtime guard (also fixes TS `.send` issues).
    if (!isSendableTextChannel(channel)) {
      logger.warn(
        { guildId: member.guild.id },
        "Welcome handler resolved a text-based channel that is not sendable",
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
