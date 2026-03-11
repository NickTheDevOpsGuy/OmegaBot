// src/services/starboard/starboardHandler.ts
//
// Handles ⭐ reactions to post highlighted messages to a starboard channel.
// Store: starboardStore.ts; Embed: starboardEmbed.ts.

import {
  type Client,
  type MessageReaction,
  type User,
  type TextChannel,
  type PartialMessageReaction,
  type PartialUser,
} from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getGuildConfig } from "../../core/config/guildConfigStore.js";
import {
  getStarboardPost,
  saveStarboardPost,
  updateStarCount,
  deleteStarboardPost,
} from "./starboardStore.js";
import { buildStarboardEmbed } from "./starboardEmbed.js";

export async function handleStarboardReaction(
  reaction: MessageReaction | PartialMessageReaction,
  _user: User | PartialUser,
  _added: boolean,
): Promise<void> {
  try {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        logger.debug({ err }, "[starboard] failed to fetch partial reaction");
        return;
      }
    }

    if (reaction.emoji.name !== "⭐") return;

    const message = reaction.message;

    if (!message.guild || !message.guildId) return;

    if (message.partial) {
      try {
        await message.fetch();
      } catch (err) {
        logger.debug({ err }, "[starboard] failed to fetch partial message");
        return;
      }
    }

    if (message.author?.bot) return;

    const config = getGuildConfig(message.guildId);
    if (!config.starboardChannelId) return;

    const threshold = config.starboardThreshold ?? 3;
    const starboardChannelId = config.starboardChannelId;

    if (message.channelId === starboardChannelId) return;

    const starReaction = message.reactions.cache.get("⭐");
    let starCount = starReaction?.count ?? 0;

    if (starReaction && message.author) {
      const users = await starReaction.users.fetch();
      if (users.has(message.author.id)) {
        starCount = Math.max(0, starCount - 1);
      }
    }

    const existingPost = getStarboardPost(message.id);

    const starboardChannel = await message.guild.channels
      .fetch(starboardChannelId)
      .catch((): null => null);

    if (!starboardChannel || !starboardChannel.isTextBased()) {
      logger.warn(
        { starboardChannelId },
        "[starboard] channel not found or not text-based",
      );
      return;
    }

    const textChannel = starboardChannel as TextChannel;

    if (existingPost) {
      if (starCount < threshold) {
        try {
          const starboardMessage = await textChannel.messages
            .fetch(existingPost.starboard_message_id)
            .catch((): null => null);
          if (starboardMessage) {
            await starboardMessage.delete();
          }
          deleteStarboardPost(message.id);
          logger.debug(
            { messageId: message.id },
            "[starboard] removed post (below threshold)",
          );
        } catch (err) {
          logger.debug({ err }, "[starboard] failed to delete starboard message");
        }
      } else {
        try {
          const starboardMessage = await textChannel.messages
            .fetch(existingPost.starboard_message_id)
            .catch((): null => null);

          if (starboardMessage) {
            const embed = buildStarboardEmbed(reaction as MessageReaction, starCount);
            await starboardMessage.edit({ embeds: [embed] });
            updateStarCount(message.id, starCount);
          }
        } catch (err) {
          logger.debug({ err }, "[starboard] failed to update starboard message");
        }
      }
    } else if (starCount >= threshold) {
      try {
        const embed = buildStarboardEmbed(reaction as MessageReaction, starCount);
        const starboardMessage = await textChannel.send({
          content: `⭐ **${starCount}** | <#${message.channelId}>`,
          embeds: [embed],
        });

        saveStarboardPost({
          originalMessageId: message.id,
          starboardMessageId: starboardMessage.id,
          guildId: message.guildId,
          channelId: message.channelId,
          starCount,
        });

        logger.info(
          { messageId: message.id, starCount },
          "[starboard] created new starboard post",
        );
      } catch (err) {
        logger.error({ err }, "[starboard] failed to create starboard post");
      }
    }
  } catch (err) {
    logger.error({ err }, "[starboard] handler error");
  }
}

export function setupStarboardListeners(client: Client): void {
  client.on("messageReactionAdd", async (reaction, user) => {
    await handleStarboardReaction(reaction, user, true);
  });

  client.on("messageReactionRemove", async (reaction, user) => {
    await handleStarboardReaction(reaction, user, false);
  });

  logger.info("[starboard] listeners registered");
}
