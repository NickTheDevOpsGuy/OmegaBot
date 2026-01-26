// src/commands/serverinfo/serverinfo.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("serverinfo")
  .setDescription("Show info about this server")
  .addBooleanOption((o) =>
    o.setName("private").setDescription("Only show the result to you").setRequired(false),
  )
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const isPrivate = interaction.options.getBoolean("private") ?? true;
  await interaction.deferReply(isPrivate ? { ephemeral: true } : undefined);

  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.editReply("This command can only be used in a server.");
    return;
  }

  const g = interaction.guild;

  const embed = new EmbedBuilder()
    .setTitle(`Server info: ${g.name}`)
    .setThumbnail(g.iconURL() ?? undefined)
    .addFields(
      { name: "Server ID", value: g.id, inline: true },
      { name: "Owner", value: `<@${g.ownerId}>`, inline: true },
      {
        name: "Created",
        value: `<t:${Math.floor(g.createdTimestamp / 1000)}:F>`,
        inline: false,
      },
      { name: "Members", value: String(g.memberCount ?? "Unknown"), inline: true },
      { name: "Boosts", value: String(g.premiumSubscriptionCount ?? 0), inline: true },
      { name: "Boost level", value: String(g.premiumTier ?? 0), inline: true },
    );

  await interaction.editReply({ embeds: [embed] });
}
