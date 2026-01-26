// src/commands/avatar/avatar.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("avatar")
  .setDescription("Show a user's avatar")
  .addUserOption((o) => o.setName("user").setDescription("User (optional)"))
  .addBooleanOption((o) =>
    o.setName("private").setDescription("Only show the result to you").setRequired(false),
  )
  .setDMPermission(true);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const isPrivate = interaction.options.getBoolean("private") ?? true;
  await interaction.deferReply(isPrivate ? { ephemeral: true } : undefined);

  const user = interaction.options.getUser("user") ?? interaction.user;
  const url = user.displayAvatarURL({ size: 1024 });

  const embed = new EmbedBuilder().setTitle(`${user.username}'s avatar`).setImage(url);

  await interaction.editReply({ embeds: [embed] });
}
