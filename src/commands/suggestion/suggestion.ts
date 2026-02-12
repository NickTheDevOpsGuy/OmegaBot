// src/commands/suggestion/suggestion.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("suggestion")
  .setDescription("Submit a suggestion (adds 👍/👎 reactions)")
  .addStringOption((o) =>
    o.setName("text").setDescription("Your suggestion").setRequired(true),
  )
  .addBooleanOption((o) =>
    o
      .setName("private")
      .setDescription("Only show confirmation to you")
      .setRequired(false),
  )
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const isPrivate = interaction.options.getBoolean("private") ?? true;
  await interaction.deferReply(isPrivate ? { ephemeral: true } : undefined);

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("This command can only be used in a server.");
    return;
  }

  const text = interaction.options.getString("text", true).trim();
  if (!text) {
    await interaction.editReply("Suggestion cannot be empty.");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("💡 New suggestion")
    .setDescription(text)
    .addFields({ name: "From", value: interaction.user.toString(), inline: true })
    .setTimestamp(new Date());

  const channel = interaction.channel;
  const sent =
    channel && "send" in channel ? await channel.send({ embeds: [embed] }) : null;
  if (sent) {
    await sent.react("👍").catch((): null => null);
    await sent.react("👎").catch((): null => null);
  }

  await interaction.editReply("✅ Suggestion posted.");
}
