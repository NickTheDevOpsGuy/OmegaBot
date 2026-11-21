import type {
  Client,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getReactionRole } from "./reactionRoleStore.js";

function reactionEmojiKey(reaction: MessageReaction | PartialMessageReaction): string {
  return reaction.emoji.id
    ? `<:${reaction.emoji.name ?? "emoji"}:${reaction.emoji.id}>`
    : (reaction.emoji.name ?? "");
}

export async function handleReactionRole(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  added: boolean,
): Promise<void> {
  if (user.bot) return;
  if (reaction.partial) {
    await reaction.fetch().catch(() => null);
  }
  const message = reaction.message;
  if (!message.guildId || !message.guild) return;

  const mapping =
    getReactionRole(message.guildId, message.id, reactionEmojiKey(reaction)) ??
    getReactionRole(message.guildId, message.id, reaction.emoji.name ?? "");
  if (!mapping) return;

  const member = await message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  if (added) {
    if (!member.roles.cache.has(mapping.roleId)) {
      await member.roles.add(mapping.roleId, "OmegaBot reaction role");
    }
  } else if (member.roles.cache.has(mapping.roleId)) {
    await member.roles.remove(mapping.roleId, "OmegaBot reaction role removed");
  }
}

export function setupReactionRoleListeners(client: Client): void {
  client.on("messageReactionAdd", async (reaction, user) => {
    await handleReactionRole(reaction, user, true).catch((err: unknown) => {
      logger.warn({ err }, "[reaction-roles] add handler threw");
    });
  });

  client.on("messageReactionRemove", async (reaction, user) => {
    await handleReactionRole(reaction, user, false).catch((err: unknown) => {
      logger.warn({ err }, "[reaction-roles] remove handler threw");
    });
  });

  logger.info("[reaction-roles] listeners registered");
}
