// src/commands/rules/rules.ts
// Show server rules (link to configured rules channel).

import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getGuildConfig } from "../../../services/core/config/guildConfigStore.js";
import { t, resolveLocale } from "../../../i18n/index.js";

export const data = new SlashCommandBuilder()
  .setName("rules")
  .setDescription("View server rules");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    const locale = resolveLocale(interaction.guild?.preferredLocale ?? null);
    await interaction.reply({
      content: t("common.guild_only", locale),
      ephemeral: true,
    });
    return;
  }

  const config = getGuildConfig(interaction.guildId);

  if (!config.rulesChannelId) {
    await interaction.reply({
      content:
        "Server rules aren't configured yet. Admins can set a rules channel with `/config rules set channel:#rules`.",
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("📜 Server Rules")
    .setDescription(`See the full rules in <#${config.rulesChannelId}>.`)
    .setColor(0x5865f2);

  await interaction.reply({ embeds: [embed] });
}
