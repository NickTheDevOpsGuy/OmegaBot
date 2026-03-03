// src/services/starboard/starboardEmbed.ts
import { EmbedBuilder, type MessageReaction, type TextChannel } from "discord.js";

export function buildStarboardEmbed(
  reaction: MessageReaction,
  starCount: number,
): EmbedBuilder {
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

  if (message.content) {
    embed.setDescription(message.content.slice(0, 4096));
  }

  const imageAttachment = message.attachments.find((a) =>
    a.contentType?.startsWith("image/"),
  );
  if (imageAttachment) {
    embed.setImage(imageAttachment.url);
  }

  embed.addFields({
    name: "Original",
    value: `[Jump to message](${message.url})`,
    inline: false,
  });

  return embed;
}
