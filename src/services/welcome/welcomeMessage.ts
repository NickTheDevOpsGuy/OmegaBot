// src/services/welcome/welcomeMessage.ts

import type { GuildMember } from "discord.js";

/**
 * Build a welcome message for a new member.
 *
 * Keep this PURE:
 * - no Discord calls
 * - no env lookups
 * - easy to tweak copy later
 */
export function buildWelcomeMessage(member: GuildMember): string {
  const handle = member.displayName || member.user.username;

  return [
    `🎉 Welcome to OmegaBot, ${handle}`,
    ``,
    `We're glad you're here.`,
    ``,
    `🚀 Getting Started`,
    ``,
    `📌 Take a quick look at the server rules`,
    `📖 Check the pinned messages in each channel for important context`,
    ``,
    `💬 Need Help?`,
    ``,
    `Not sure where to jump in? Just ask.`,
    `The community's friendly and someone will point you in the right direction.`,
    ``,
    `Let's build something cool together 🤖`,
  ].join("\n");
}
