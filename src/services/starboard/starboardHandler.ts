// src/services/starboard/starboardHandler.ts
import {
  EmbedBuilder,
  type Client,
  type MessageReaction,
  type User,
  type TextChannel,
  type PartialMessageReaction,
  type PartialUser,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { getDb } from "../database/db.js";
import { getGuildConfig } from "../config/guildConfigStore.js";

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

function ensureStarboardTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS starboard_posts (
      original_message_id TEXT PRIMARY KEY,
      starboard_message_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      star_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_starboard_guild ON starboard_posts(guild_id);
  `);
}

type StarboardPost = {
  original_message_id: string;
  starboard_message_id: string;
  guild_id: string;
  channel_id: string;
  star_count: number;
};

function getStarboardPost(messageId: string): StarboardPost | null {
  ensureStarboardTable();
  const db = getDb();
  return db
    .prepare(`SELECT * FROM starboard_posts WHERE original_message_id = ?`)
    .get(messageId) as StarboardPost | null;
}

function saveStarboardPost(data: {
  originalMessageId: string;
  starboardMessageId: string;
  guildId: string;
  channelId: string;
  starCount: number;
}): void {
  ensureStarboardTable();
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `INSERT OR REPLACE INTO starboard_posts 
     (original_message_id, starboard_message_id, guild_id, channel_id, star_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    data.originalMessageId,
    data.starboardMessageId,
    data.guildId,
    data.channelId,
    data.starCount,
    now,
  );
}

function updateStarCount(messageId: string, starCount: number): void {
  ensureStarboardTable();
  const db = getDb();
  db.prepare(
    `UPDATE starboard_posts SET star_count = ? WHERE original_message_id = ?`,
  ).run(starCount, messageId);
}

function deleteStarboardPost(messageId: string): void {
  ensureStarboardTable();
  const db = getDb();
  db.prepare(`DELETE FROM starboard_posts WHERE original_message_id = ?`).run(messageId);
}

/* -------------------------------------------------------------------------- */
/* Embed Builder                                                               */
/* -------------------------------------------------------------------------- */

function buildStarboardEmbed(reaction: MessageReaction, starCount: number): EmbedBuilder {
  const message = reaction.message;
  const author = message.author;

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setAuthor({
      name: author?.username ?? "Unknown",
      iconURL: author?.displayAvatarURL(),
    })
    .setTimestamp(message.createdAt)
    .setFooter({ text: `⭐ ${starCount} | #${(message.channel as TextChannel).name}` });

  // Add message content
  if (message.content) {
    embed.setDescription(message.content.slice(0, 4096));
  }

  // Add first image attachment
  const imageAttachment = message.attachments.find((a) =>
    a.contentType?.startsWith("image/"),
  );
  if (imageAttachment) {
    embed.setImage(imageAttachment.url);
  }

  // Add link to original
  embed.addFields({
    name: "Original",
    value: `[Jump to message](${message.url})`,
    inline: false,
  });

  return embed;
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                     */
/* -------------------------------------------------------------------------- */

export async function handleStarboardReaction(
  reaction: MessageReaction | PartialMessageReaction,
  _user: User | PartialUser,
  _added: boolean,
): Promise<void> {
  try {
    // Fetch partial reaction if needed
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        logger.debug({ err }, "[starboard] failed to fetch partial reaction");
        return;
      }
    }

    // Only handle star emoji
    if (reaction.emoji.name !== "⭐") return;

    const message = reaction.message;

    // Must be in a guild
    if (!message.guild || !message.guildId) return;

    // Fetch the message if partial
    if (message.partial) {
      try {
        await message.fetch();
      } catch (err) {
        logger.debug({ err }, "[starboard] failed to fetch partial message");
        return;
      }
    }

    // Don't star bot messages
    if (message.author?.bot) return;

    // Get guild config
    const config = getGuildConfig(message.guildId);
    if (!config.starboardChannelId) return;

    const threshold = config.starboardThreshold ?? 3;
    const starboardChannelId = config.starboardChannelId;

    // Don't star messages from the starboard channel itself
    if (message.channelId === starboardChannelId) return;

    // Count stars (excluding the message author)
    const starReaction = message.reactions.cache.get("⭐");
    let starCount = starReaction?.count ?? 0;

    // If the author starred their own message, don't count it
    if (starReaction && message.author) {
      const users = await starReaction.users.fetch();
      if (users.has(message.author.id)) {
        starCount = Math.max(0, starCount - 1);
      }
    }

    // Get or create starboard post
    const existingPost = getStarboardPost(message.id);

    // Get the starboard channel
    const starboardChannel = await message.guild.channels
      .fetch(starboardChannelId)
      .catch(() => null);

    if (!starboardChannel || !starboardChannel.isTextBased()) {
      logger.warn(
        { starboardChannelId },
        "[starboard] channel not found or not text-based",
      );
      return;
    }

    const textChannel = starboardChannel as TextChannel;

    if (existingPost) {
      // Update existing post
      if (starCount < threshold) {
        // Remove from starboard if below threshold
        try {
          const starboardMessage = await textChannel.messages
            .fetch(existingPost.starboard_message_id)
            .catch(() => null);
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
        // Update star count
        try {
          const starboardMessage = await textChannel.messages
            .fetch(existingPost.starboard_message_id)
            .catch(() => null);

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
      // Create new starboard post
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

/* -------------------------------------------------------------------------- */
/* Setup                                                                       */
/* -------------------------------------------------------------------------- */

export function setupStarboardListeners(client: Client): void {
  client.on("messageReactionAdd", async (reaction, user) => {
    await handleStarboardReaction(reaction, user, true);
  });

  client.on("messageReactionRemove", async (reaction, user) => {
    await handleStarboardReaction(reaction, user, false);
  });

  logger.info("[starboard] listeners registered");
}
