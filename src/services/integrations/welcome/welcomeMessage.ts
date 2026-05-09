// src/services/welcome/welcomeMessage.ts

import type { GuildMember } from "discord.js";

/** Stakeholders form – so we know who you are and how to contact you (e.g. Google Meets). */
export const STAKEHOLDERS_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSezRIhc7pvsQqEY0KnSIUI-PYXxLil4c7MPwPTalcKX9P-MQg/viewform?usp=sharing&ouid=113408318770074166535";

/** Community wiki – docs, guides, and what we're about. */
export const WIKI_URL = "https://github.com/WRDLNKDN/WebDev/wiki";

/** Agreements repo – contributor policies, reimbursement, and official agreements. */
export const AGREEMENTS_URL = "https://github.com/WRDLNKDN/Agreements";

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

  const handle = member.displayName || member.user.username;
  const botName = member.client?.user?.username;
  const name = handle && handle !== botName ? handle : "there";

  return [
    `🎉 Welcome to OmegaBot, ${name}`,
    ``,
    `We're glad you're here.`,
    ``,
    `🚀 Getting Started`,
    ``,
    `📌 Take a quick look at the server rules`,
    `📖 Check the pinned messages in **#general** for important context`,
    ``,
    `📋 **Stakeholders form** – Please fill this out so we know who you are and how to reach you (e.g. for Google Meets):`,
    STAKEHOLDERS_FORM_URL,
    ``,
    `📚 **Wiki** – Our docs and guides:`,
    WIKI_URL,
    ``,
    `📜 **Agreements** – Contributor policies, reimbursement, and official agreements:`,
    AGREEMENTS_URL,
    ``,
    `💬 Need Help?`,
    ``,
    `Want to blow off some steam? Run some games in **#bots**.`,
    `For bot help, type \`/help <topic>\` for bot help.`,
    ``,
    `Not sure where to jump in? Just ask.`,
    `The community's friendly and someone will point you in the right direction.`,
    ``,
    `Let's build something cool together 🤖`,
  ].join("\n");
}
