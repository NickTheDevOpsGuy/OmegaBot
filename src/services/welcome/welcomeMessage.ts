// src/services/welcome/welcomeMessage.ts

import type { GuildMember } from "discord.js";

export const AGREEMENTS_WIKI_URL = "https://github.com/WRDLNKDN/Agreements";

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
    `🎉 Welcome to OmegaBot, ${handle}!`,
    ``,
    `We're glad you're here.`,
    ``,
    `🚀 Getting Started`,
    ``,
    `📌 Take a quick look at the server rules and pinned channel messages.`,
    `📚 See what we're all about in the wiki:`,
    AGREEMENTS_WIKI_URL,
    `🤖 Run \`/help topic:overview\` for a quick command tour.`,
    ``,
    `💬 Need Help?`,
    ``,
    `Not sure where to jump in? Just ask in chat.`,
    `The community is friendly and someone will point you in the right direction.`,
    ``,
    `Let's build something cool together 🤖`,
  ].join("\n");
}
