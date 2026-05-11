// src/services/welcome/welcomeMessage.ts

import type { GuildMember } from "discord.js";

export function renderWelcomeTemplate(member: GuildMember, template: string): string {
  const handle = member.displayName || member.user.username;
  const botName = member.client?.user?.username;
  const name = handle && handle !== botName ? handle : "there";
  const username = member.user.username;
  const server = member.guild.name;

  return template
    .replaceAll("{user}", `<@${member.user.id}>`)
    .replaceAll("{name}", name)
    .replaceAll("{username}", username)
    .replaceAll("{server}", server);
}

/**
 * Build a welcome message for a new member.
 *
 * Keep this PURE:
 * - no Discord calls
 * - no env lookups
 * - easy to tweak copy later
 */
export function buildWelcomeMessage(
  member: GuildMember,
  customMessage?: string | null,
): string {
  if (customMessage?.trim()) {
    return renderWelcomeTemplate(member, customMessage.trim());
  }

  return renderWelcomeTemplate(
    member,
    [
      `🎉 Welcome to {server}, {name}!`,
      ``,
      `We're glad you're here.`,
      ``,
      `Please take a look at the server rules and pinned messages when you have a moment.`,
      `Feel free to introduce yourself and ask questions if you need a hand getting started.`,
      ``,
      `For bot help, type \`/help <topic>\`.`,
    ].join("\n"),
  );
}
