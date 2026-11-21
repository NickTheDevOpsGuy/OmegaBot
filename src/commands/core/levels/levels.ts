import {
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  buildProgressBar,
  getGuildLeaderboard,
  getGuildProgression,
} from "../../../services/stores/leveling/levelingStore.js";

export const data = new SlashCommandBuilder()
  .setName("levels")
  .setDescription("View server XP ranks and leaderboards")
  .addSubcommand((sub) =>
    sub
      .setName("rank")
      .setDescription("View a member's server level")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Member to view").setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("leaderboard")
      .setDescription("View the server XP leaderboard")
      .addIntegerOption((opt) =>
        opt
          .setName("limit")
          .setDescription("Number of members to show")
          .setMinValue(1)
          .setMaxValue(25),
      ),
  );

export const group = "core";

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "Levels are server-only.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === "rank") {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const progress = getGuildProgression(interaction.guildId, user.id);
    const rankLabel = progress.rank ? `#${progress.rank}` : "Unranked";

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Server Rank`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setColor(0x5865f2)
      .addFields(
        { name: "Rank", value: rankLabel, inline: true },
        { name: "Level", value: String(progress.level), inline: true },
        { name: "XP", value: String(progress.xp), inline: true },
        {
          name: "Progress",
          value: `[${buildProgressBar(progress.xpIntoLevel, progress.xpForNextLevel)}] ${progress.xpIntoLevel}/${progress.xpForNextLevel}`,
          inline: false,
        },
        { name: "Messages counted", value: String(progress.messageCount), inline: true },
      );

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (sub === "leaderboard") {
    const limit = interaction.options.getInteger("limit") ?? 10;
    const rows = getGuildLeaderboard(interaction.guildId, limit);

    const description =
      rows.length > 0
        ? rows
            .map(
              (entry) =>
                `**#${entry.rank}** <@${entry.userId}> - Level **${entry.level}**, ${entry.xp} XP`,
            )
            .join("\n")
        : "No one has earned message XP yet.";

    const embed = new EmbedBuilder()
      .setTitle("Server Level Leaderboard")
      .setColor(0x5865f2)
      .setDescription(description);

    await interaction.reply({ embeds: [embed] });
    return;
  }

  await interaction.reply({
    content: "Unknown levels option.",
    flags: MessageFlags.Ephemeral,
  });
}
