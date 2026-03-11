// src/commands/info/handlers/avatar.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

type AvatarFormat = "png" | "jpg" | "webp" | "gif";

export async function handleAvatar(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const member = interaction.guild?.members.cache.get(targetUser.id);
  const size = interaction.options.getInteger("size") ?? 4096;
  const format = interaction.options.getString("format") as AvatarFormat | null;

  const urlOpts =
    format === "gif"
      ? { extension: "gif" as const, forceStatic: false }
      : { extension: (format ?? undefined) as "png" | "jpg" | "webp" | undefined };
  const globalAvatar = targetUser.displayAvatarURL({ ...urlOpts, size });
  const serverAvatar = member?.displayAvatarURL({ ...urlOpts, size });

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s Avatar`)
    .setImage(serverAvatar ?? globalAvatar)
    .setColor(member?.displayColor ?? 0x5865f2);

  const sizes = [128, 256, 512, 1024, 4096] as const;
  const links = sizes.map(
    (s) => `[${s}](${targetUser.displayAvatarURL({ ...urlOpts, size: s })})`,
  );
  embed.setDescription(`**Sizes:** ${links.join(" • ")}`);

  if (serverAvatar && serverAvatar !== globalAvatar) {
    embed.addFields({
      name: "🌐 Global Avatar",
      value: `[View](${globalAvatar})`,
      inline: true,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
