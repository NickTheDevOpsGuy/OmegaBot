// src/commands/config/view.ts
// /config view — show all server settings.

import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { getGuildConfig } from "../../../services/core/config/guildConfigStore.js";
import { listModeratorRoles } from "./moderatorRole.js";

export async function handleView(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const config = getGuildConfig(interaction.guildId!);

  const embed = new EmbedBuilder().setTitle("⚙️ Server Configuration").setColor(0x5865f2);

  const welcomeStatus = config.welcomeChannelId
    ? `✅ Enabled - <#${config.welcomeChannelId}>`
    : "❌ Not configured";
  embed.addFields({
    name: "👋 Welcome Messages",
    value: welcomeStatus,
    inline: false,
  });

  const starboardStatus = config.starboardChannelId
    ? `✅ Enabled - <#${config.starboardChannelId}> (${config.starboardThreshold ?? 3}⭐ required)`
    : "❌ Not configured";
  embed.addFields({
    name: "⭐ Starboard",
    value: starboardStatus,
    inline: false,
  });

  const rulesStatus = config.rulesChannelId
    ? `✅ <#${config.rulesChannelId}>`
    : "❌ Not configured";
  embed.addFields({
    name: "📜 Rules",
    value: rulesStatus,
    inline: false,
  });

  const modRoleIds = listModeratorRoles(interaction.guildId!);
  const modStatus =
    modRoleIds.length > 0
      ? modRoleIds.map((id) => `<@&${id}>`).join(", ")
      : "None (use `/config moderator-role add`)";
  embed.addFields({
    name: "🛡️ Moderator roles",
    value: modStatus,
    inline: false,
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
