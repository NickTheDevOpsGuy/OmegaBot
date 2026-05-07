import {
  ChannelType,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  getGuildConfig,
  setGuildConfig,
} from "../../../services/core/config/guildConfigStore.js";
import {
  listLevelRoleRewards,
  removeLevelRoleReward,
  setLevelRoleReward,
} from "../../../services/stores/leveling/levelingStore.js";

export async function handleLeveling(
  interaction: ChatInputCommandInteraction,
  sub: string,
): Promise<void> {
  if (sub === "enable") {
    await setGuildConfig(interaction.guildId!, { levelingEnabled: true });
    await interaction.reply({
      content: "✅ Message XP leveling enabled.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "disable") {
    await setGuildConfig(interaction.guildId!, { levelingEnabled: false });
    await interaction.reply({
      content: "✅ Message XP leveling disabled.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "announce-channel") {
    const channel = interaction.options.getChannel("channel");
    if (channel && channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "Please choose a text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await setGuildConfig(interaction.guildId!, {
      levelingAnnounceChannelId: channel?.id ?? null,
    });

    await interaction.reply({
      content: channel
        ? `✅ Level-up announcements will go to <#${channel.id}>.`
        : "✅ Level-up announcements will happen in the channel where the user leveled up.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "role-add") {
    const level = interaction.options.getInteger("level", true);
    const role = interaction.options.getRole("role", true);
    setLevelRoleReward(interaction.guildId!, level, role.id);

    await interaction.reply({
      content: `✅ Members who reach level **${level}** will receive <@&${role.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "role-remove") {
    const level = interaction.options.getInteger("level", true);
    const removed = removeLevelRoleReward(interaction.guildId!, level);

    await interaction.reply({
      content: removed
        ? `✅ Removed the level **${level}** role reward.`
        : `No role reward was configured for level **${level}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "status") {
    const config = await getGuildConfig(interaction.guildId!);
    const rewards = listLevelRoleRewards(interaction.guildId!);
    const rewardText =
      rewards.length > 0
        ? rewards.map((reward) => `Level ${reward.level}: <@&${reward.roleId}>`).join("\n")
        : "No role rewards configured.";

    await interaction.reply({
      content: [
        "**Leveling Status**",
        `• Enabled: ${config.levelingEnabled ? "yes" : "no"}`,
        `• Announcements: ${
          config.levelingAnnounceChannelId
            ? `<#${config.levelingAnnounceChannelId}>`
            : "same channel"
        }`,
        "",
        rewardText,
      ].join("\n"),
      flags: MessageFlags.Ephemeral,
    });
  }
}
