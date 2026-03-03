// src/commands/info/handlers/serverInfo.ts
import {
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  ChannelType,
} from "discord.js";
import { logger } from "../../../utils/logger.js";

export async function handleServerInfo(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guild = interaction.guild;
  const wantInvite = interaction.options.getBoolean("invite") ?? false;

  if (!guild) {
    await interaction.editReply("This command can only be used in a server.");
    return;
  }

  await guild.members.fetch().catch((): null => null);

  const textChannels = guild.channels.cache.filter(
    (c): boolean => c.type === ChannelType.GuildText,
  ).size;
  const voiceChannels = guild.channels.cache.filter(
    (c): boolean => c.type === ChannelType.GuildVoice,
  ).size;
  const categories = guild.channels.cache.filter(
    (c): boolean => c.type === ChannelType.GuildCategory,
  ).size;

  const totalMembers = guild.memberCount;
  const botCount = guild.members.cache.filter((m) => m.user.bot).size;
  const humanCount = totalMembers - botCount;

  const embed = new EmbedBuilder()
    .setTitle(guild.name)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .setColor(0x5865f2);

  if (guild.description) {
    embed.setDescription(guild.description);
  }

  embed.addFields(
    {
      name: "📋 General",
      value: [
        `**ID:** \`${guild.id}\``,
        `**Owner:** <@${guild.ownerId}>`,
        `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
        `**Boost Level:** ${guild.premiumTier} (${guild.premiumSubscriptionCount ?? 0} boosts)`,
      ].join("\n"),
      inline: true,
    },
    {
      name: "👥 Members",
      value: [
        `**Total:** ${totalMembers.toLocaleString()}`,
        `**Humans:** ${humanCount.toLocaleString()}`,
        `**Bots:** ${botCount.toLocaleString()}`,
      ].join("\n"),
      inline: true,
    },
    {
      name: "📁 Channels",
      value: [
        `**Text:** ${textChannels}`,
        `**Voice:** ${voiceChannels}`,
        `**Categories:** ${categories}`,
      ].join("\n"),
      inline: true,
    },
    {
      name: "📊 Other",
      value: [
        `**Roles:** ${guild.roles.cache.size}`,
        `**Emojis:** ${guild.emojis.cache.size}`,
        `**Stickers:** ${guild.stickers.cache.size}`,
      ].join("\n"),
      inline: true,
    },
  );

  if (guild.bannerURL()) {
    embed.setImage(guild.bannerURL({ size: 512 }));
  }

  if (wantInvite && interaction.channel && "invites" in interaction.channel) {
    const channel = interaction.channel as TextChannel & {
      invites: {
        create(options: {
          maxAge: number;
          maxUses: number;
          reason: string;
        }): Promise<{ url: string }>;
      };
    };
    const canCreate = guild.members.me
      ?.permissionsIn(channel)
      .has(PermissionFlagsBits.CreateInstantInvite);
    if (canCreate) {
      try {
        const invite = await channel.invites.create({
          maxAge: 86400,
          maxUses: 10,
          reason: "Invite from /info server",
        });
        embed.addFields({
          name: "🔗 Invite (24h, 10 uses)",
          value: invite.url,
          inline: false,
        });
      } catch (inviteErr) {
        logger.debug(
          { err: inviteErr, channelId: channel.id },
          "[info/server] invite creation failed (e.g. channel permission)",
        );
      }
    }
  }

  await interaction.editReply({ embeds: [embed] });
}
