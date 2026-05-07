import type { Client, Message } from "discord.js";
import { getGuildConfig } from "../../core/config/guildConfigStore.js";
import { logger } from "../../../utils/logger.js";
import {
  awardGuildMessageXp,
  getUnlockedLevelRoleRewards,
} from "./levelingStore.js";

const MESSAGE_XP_MIN = 15;
const MESSAGE_XP_MAX = 25;
const MESSAGE_XP_COOLDOWN_MS = 60_000;
const cooldowns = new Map<string, number>();

type SendableChannel = {
  send: (options: {
    content: string;
    allowedMentions?: { users?: string[] };
  }) => Promise<unknown>;
};

function isSendableChannel(channel: unknown): channel is SendableChannel {
  return (
    typeof channel === "object" &&
    channel !== null &&
    "send" in channel &&
    typeof (channel as { send?: unknown }).send === "function"
  );
}

function xpForMessage(messageId: string): number {
  const tail = Number.parseInt(messageId.slice(-6), 10);
  const spread = MESSAGE_XP_MAX - MESSAGE_XP_MIN + 1;
  return MESSAGE_XP_MIN + (Number.isFinite(tail) ? tail % spread : 0);
}

async function sendLevelUpMessage(
  message: Message,
  channel: SendableChannel,
  level: number,
): Promise<void> {
  await channel
    .send({
      content: `GG <@${message.author.id}>! You reached level **${level}**.`,
      allowedMentions: { users: [message.author.id] },
    })
    .catch((err: unknown) => {
      logger.debug({ err, guildId: message.guildId }, "[leveling] announce failed");
    });
}

async function applyRoleRewards(message: Message, level: number): Promise<string[]> {
  const member = message.member;
  if (!member || !message.guildId) return [];

  const rewards = getUnlockedLevelRoleRewards(message.guildId, level);
  const granted: string[] = [];

  for (const reward of rewards) {
    if (member.roles.cache.has(reward.roleId)) continue;
    await member.roles.add(reward.roleId, `OmegaBot level ${reward.level} reward`);
    granted.push(reward.roleId);
  }

  return granted;
}

export function setupLevelingMessageHandler(client: Client): void {
  client.on("messageCreate", async (message) => {
    if (!message.guildId || message.author.bot || !message.member) return;

    const config = await getGuildConfig(message.guildId);
    if (!config.levelingEnabled) return;

    const key = `${message.guildId}:${message.author.id}`;
    const now = Date.now();
    const lastAwarded = cooldowns.get(key) ?? 0;
    if (now - lastAwarded < MESSAGE_XP_COOLDOWN_MS) return;
    cooldowns.set(key, now);

    try {
      const result = awardGuildMessageXp(
        message.guildId,
        message.author.id,
        xpForMessage(message.id),
      );

      if (!result.leveledUp) return;

      const grantedRoleIds = await applyRoleRewards(message, result.after.level).catch(
        (err) => {
          logger.warn(
            { err, guildId: message.guildId, userId: message.author.id },
            "[leveling] role reward failed",
          );
          return [];
        },
      );

      const announceChannel =
        config.levelingAnnounceChannelId &&
        (await client.channels.fetch(config.levelingAnnounceChannelId).catch(() => null));

      const targetChannel = isSendableChannel(announceChannel)
        ? announceChannel
        : message.channel;
      if (!isSendableChannel(targetChannel)) return;

      await sendLevelUpMessage(message, targetChannel, result.after.level);

      logger.info(
        {
          guildId: message.guildId,
          userId: message.author.id,
          level: result.after.level,
          grantedRoleIds,
        },
        "[leveling] user leveled up",
      );
    } catch (err) {
      logger.warn(
        { err, guildId: message.guildId, userId: message.author.id },
        "[leveling] message xp handler threw",
      );
    }
  });

  logger.info("[leveling] message XP enabled");
}
