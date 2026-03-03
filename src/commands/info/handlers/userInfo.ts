// src/commands/info/handlers/userInfo.ts
import {
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";

export async function handleUserInfo(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const member = interaction.guild?.members.cache.get(targetUser.id) as
    | GuildMember
    | undefined;

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setColor(member?.displayColor ?? 0x5865f2);

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

    const keyPerms: string[] = [];
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      keyPerms.push("Administrator");
    } else {
      if (member.permissions.has(PermissionFlagsBits.ManageGuild))
        keyPerms.push("Manage Server");
      if (member.permissions.has(PermissionFlagsBits.ManageMessages))
        keyPerms.push("Manage Messages");
      if (member.permissions.has(PermissionFlagsBits.BanMembers))
        keyPerms.push("Ban Members");
      if (member.permissions.has(PermissionFlagsBits.KickMembers))
        keyPerms.push("Kick Members");
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
