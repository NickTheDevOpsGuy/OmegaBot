// src/services/discord/safeReply.ts
//
// Safe reply helper for Discord interactions.
//
// Goal:
// - Avoid "Interaction already replied" and "Unknown interaction" pitfalls
// - Let callers write one consistent "respond" call
//
// Behavior:
// - If interaction already has a reply or was deferred, use editReply(string)
// - Otherwise use reply({ content, flags? })
//
// Notes:
// - Discord does not allow setting Ephemeral on editReply.
//   So we only apply ephemeral flags on the initial reply.

import { MessageFlags, type InteractionReplyOptions } from "discord.js";

export type SafeReplyOptions = {
  content: string;
  ephemeral?: boolean;
};

function toReplyOptions(opts: SafeReplyOptions): InteractionReplyOptions {
  if (opts.ephemeral) {
    return { content: opts.content, flags: MessageFlags.Ephemeral };
  }
  return { content: opts.content };
}

/**
 * The minimal shape we need from an interaction.
 *
 * Important:
 * - editReply only accepts a string (or edit options), and cannot set Ephemeral.
 * - We only ever edit with a string, so keep the type strict to avoid mismatches.
 */
type SafeInteraction = {
  replied: boolean;
  deferred: boolean;
  reply: (options: InteractionReplyOptions) => Promise<unknown>;
  editReply: (content: string) => Promise<unknown>;
};

/**
 * Safely respond to an interaction exactly once.
 */
export async function safeReply(
  interaction: SafeInteraction,
  opts: SafeReplyOptions,
): Promise<void> {
  if (interaction.replied || interaction.deferred) {
    await interaction.editReply(opts.content);
    return;
  }

  await interaction.reply(toReplyOptions(opts));
}
