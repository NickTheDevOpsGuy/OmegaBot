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
  const username = member.user.username;

  return [
    `👋 Welcome, ${username}!`,
    ``,
    `Here’s how to get started:`,
    `📌 Check the server rules`,
    `📖 Read the pinned messages`,
    ``,
    `❓ If you're not sure where to go, just ask — someone will help you out.`,
  ].join("\n");
}