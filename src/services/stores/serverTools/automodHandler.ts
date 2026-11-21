import type { Client, Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { logger } from "../../../utils/logger.js";
import {
  getAutomodSettings,
  listBannedWords,
  type AutomodSettings,
} from "./automodStore.js";
import { addWarning } from "./warningsStore.js";

const INVITE_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/i;
const URL_RE = /https?:\/\/|(?:^|\s)(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/\S*)?/i;
const recentMessages = new Map<string, number[]>();

type DeletableNotice = { delete: () => Promise<unknown> };
type SendableChannel = {
  send: (options: {
    content: string;
    allowedMentions?: { users?: string[] };
  }) => Promise<DeletableNotice>;
};

function isSendableChannel(channel: unknown): channel is SendableChannel {
  return (
    typeof channel === "object" &&
    channel !== null &&
    "send" in channel &&
    typeof (channel as { send?: unknown }).send === "function"
  );
}

function hasManageMessages(message: Message): boolean {
  return Boolean(
    message.member?.permissions.has(PermissionFlagsBits.ManageMessages) ||
    message.member?.permissions.has(PermissionFlagsBits.Administrator),
  );
}

function isCapsViolation(content: string, settings: AutomodSettings): boolean {
  const letters = [...content].filter((char) => /[a-z]/i.test(char));
  if (letters.length < 12) return false;
  const caps = letters.filter((char) => char >= "A" && char <= "Z").length;
  return Math.round((caps / letters.length) * 100) >= settings.capsPercent;
}

function isSpamViolation(message: Message, settings: AutomodSettings): boolean {
  const key = `${message.guildId}:${message.author.id}`;
  const now = Date.now();
  const windowMs = settings.spamWindowSeconds * 1000;
  const timestamps = (recentMessages.get(key) ?? []).filter((ts) => now - ts <= windowMs);
  timestamps.push(now);
  recentMessages.set(key, timestamps);
  return timestamps.length >= settings.spamMessageCount;
}

function findViolation(
  message: Message,
  settings: AutomodSettings,
  bannedWords: string[],
): string | null {
  const content = message.content.trim();
  const lower = content.toLowerCase();

  const bannedWord = bannedWords.find((word) => lower.includes(word));
  if (bannedWord) return `banned word: ${bannedWord}`;
  if (settings.blockInvites && INVITE_RE.test(content)) return "Discord invite";
  if (settings.blockLinks && URL_RE.test(content)) return "link";
  if (settings.blockCaps && isCapsViolation(content, settings)) return "excess caps";
  if (settings.blockSpam && isSpamViolation(message, settings)) return "message spam";
  return null;
}

export async function handleAutomodMessage(message: Message): Promise<boolean> {
  if (!message.guildId || message.author.bot || !message.member) return false;
  if (hasManageMessages(message)) return false;

  const settings = getAutomodSettings(message.guildId);
  if (!settings.enabled) return false;

  const violation = findViolation(message, settings, listBannedWords(message.guildId));
  if (!violation) return false;

  await message.delete().catch((err: unknown) => {
    logger.debug({ err, guildId: message.guildId }, "[automod] delete failed");
  });

  addWarning({
    guildId: message.guildId,
    userId: message.author.id,
    moderatorId: message.client.user?.id ?? "automod",
    reason: `Automod: ${violation}`,
    source: "automod",
  });

  if (isSendableChannel(message.channel)) {
    await message.channel
      .send({
        content: `<@${message.author.id}> your message was removed by automod (${violation}).`,
        allowedMentions: { users: [message.author.id] },
      })
      .then((notice) => {
        setTimeout(() => void notice.delete().catch(() => {}), 8_000);
      })
      .catch(() => {});
  }

  logger.info(
    { guildId: message.guildId, userId: message.author.id, violation },
    "[automod] message removed",
  );
  return true;
}

export function setupAutomodMessageHandler(client: Client): void {
  client.on("messageCreate", async (message) => {
    await handleAutomodMessage(message).catch((err: unknown) => {
      logger.warn({ err, guildId: message.guildId }, "[automod] handler threw");
    });
  });

  logger.info("[automod] message handler enabled");
}
