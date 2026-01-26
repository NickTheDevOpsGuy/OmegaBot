// src/commands/userinfo/userinfo.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("userinfo")
  .setDescription("Show info about a user")
  .addUserOption((o) => o.setName("user").setDescription("User (optional)"))
  .addBooleanOption((o) =>
    o.setName("private").setDescription("Only show the result to you").setRequired(false),
  )
  .setDMPermission(true);

function fmt(d: Date | null | undefined): string {
  return d ? `<t:${Math.floor(d.getTime() / 1000)}:F>` : "Unknown";
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const isPrivate = interaction.options.getBoolean("private") ?? true;
  await interaction.deferReply(isPrivate ? { ephemeral: true } : undefined);

  const user = interaction.options.getUser("user") ?? interaction.user;

  const embed = new EmbedBuilder()
    .setTitle(`User info: ${user.username}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields({ name: "User", value: user.toString(), inline: true })
    .addFields({ name: "User ID", value: user.id, inline: true })
    .addFields({ name: "Created", value: fmt(user.createdAt), inline: false });

  if (interaction.inGuild()) {
    const member = await interaction.guild?.members.fetch(user.id).catch(() => null);
    if (member) {
      embed.addFields(
        { name: "Joined", value: fmt(member.joinedAt), inline: false },
        {
          name: "Roles",
          value:
            member.roles.cache
              .filter((r) => r.id !== interaction.guildId)
              .map((r) => r.toString())
              .slice(0, 20)
              .join(" ") || "None",
          inline: false,
        },
      );
    }
  }

  await interaction.editReply({ embeds: [embed] });
}
