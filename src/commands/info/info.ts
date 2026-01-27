// src/commands/info/info.ts
//
// Consolidated information command for users and servers.
//
// Subcommands:
// - /info user [@user]  - View user details, roles, permissions
// - /info server        - View server statistics
// - /info avatar [@user] - View user's avatar in multiple sizes
//
// This consolidates the old /userinfo, /serverinfo, and /avatar commands.

import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  ChannelType,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("info")
  .setDescription("Get information about users or the server")
  .addSubcommand((s) =>
    s
      .setName("user")
      .setDescription("View information about a user")
      .addUserOption((o) => o.setName("user").setDescription("User to look up"))
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )
  .addSubcommand((s) =>
    s
      .setName("server")
      .setDescription("View information about this server")
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  )
  .addSubcommand((s) =>
    s
      .setName("avatar")
      .setDescription("View a user's avatar")
      .addUserOption((o) => o.setName("user").setDescription("User to view avatar for"))
      .addBooleanOption((o) => o.setName("private").setDescription("Only show to you")),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const ephemeral = interaction.options.getBoolean("private") ?? false;

  await interaction.deferReply({ ephemeral });

  if (sub === "user") {
    await handleUserInfo(interaction);
  } else if (sub === "server") {
    await handleServerInfo(interaction);
  } else if (sub === "avatar") {
    await handleAvatar(interaction);
  }
}

/* -------------------------------------------------------------------------- */
/* User Info                                                                   */
/* -------------------------------------------------------------------------- */

async function handleUserInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const member = interaction.guild?.members.cache.get(targetUser.id) as
    | GuildMember
    | undefined;

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setColor(member?.displayColor ?? 0x5865f2);

  // Basic info
  embed.addFields({
    name: "📋 User Info",
    value: [
      `**ID:** \`${targetUser.id}\``,
      `**Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
      targetUser.bot ? "**Bot:** Yes" : null,
    ]
      .filter(Boolean)
      .join("\n"),
    inline: true,
  });

  // Server-specific info
  if (member) {
    const roles = member.roles.cache
      .filter((r) => r.id !== interaction.guild?.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => r.toString())
      .slice(0, 10);

    embed.addFields({
      name: "🏠 Server Info",
      value: [
        `**Joined:** <t:${Math.floor((member.joinedTimestamp ?? 0) / 1000)}:R>`,
        member.nickname ? `**Nickname:** ${member.nickname}` : null,
        `**Roles:** ${roles.length > 0 ? roles.join(", ") : "None"}${member.roles.cache.size > 11 ? ` (+${member.roles.cache.size - 11} more)` : ""}`,
      ]
        .filter(Boolean)
        .join("\n"),
      inline: false,
    });

    // Permissions (key ones)
    const keyPerms = [];
    if (member.permissions.has("Administrator")) keyPerms.push("Administrator");
    else {
      if (member.permissions.has("ManageGuild")) keyPerms.push("Manage Server");
      if (member.permissions.has("ManageMessages")) keyPerms.push("Manage Messages");
      if (member.permissions.has("BanMembers")) keyPerms.push("Ban Members");
      if (member.permissions.has("KickMembers")) keyPerms.push("Kick Members");
    }

    if (keyPerms.length > 0) {
      embed.addFields({
        name: "🔑 Key Permissions",
        value: keyPerms.join(", "),
        inline: false,
      });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}

/* -------------------------------------------------------------------------- */
/* Server Info                                                                 */
/* -------------------------------------------------------------------------- */

async function handleServerInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild;

  if (!guild) {
    await interaction.editReply("This command can only be used in a server.");
    return;
  }

  // Fetch more data
  await guild.members.fetch().catch(() => null);

  const textChannels = guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildText,
  ).size;
  const voiceChannels = guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildVoice,
  ).size;
  const categories = guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildCategory,
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

  await interaction.editReply({ embeds: [embed] });
}

/* -------------------------------------------------------------------------- */
/* Avatar                                                                      */
/* -------------------------------------------------------------------------- */

async function handleAvatar(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const member = interaction.guild?.members.cache.get(targetUser.id);

  const globalAvatar = targetUser.displayAvatarURL({ size: 4096 });
  const serverAvatar = member?.displayAvatarURL({ size: 4096 });

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s Avatar`)
    .setImage(serverAvatar ?? globalAvatar)
    .setColor(member?.displayColor ?? 0x5865f2);

  // Add links for different sizes
  const links = [
    `[128](${targetUser.displayAvatarURL({ size: 128 })})`,
    `[256](${targetUser.displayAvatarURL({ size: 256 })})`,
    `[512](${targetUser.displayAvatarURL({ size: 512 })})`,
    `[1024](${targetUser.displayAvatarURL({ size: 1024 })})`,
    `[4096](${targetUser.displayAvatarURL({ size: 4096 })})`,
  ];

  embed.setDescription(`**Sizes:** ${links.join(" • ")}`);

  // If server avatar differs from global
  if (serverAvatar && serverAvatar !== globalAvatar) {
    embed.addFields({
      name: "🌐 Global Avatar",
      value: `[View](${globalAvatar})`,
      inline: true,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
