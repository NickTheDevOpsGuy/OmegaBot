// src/commands/profile/subcommands/view.ts
//
// /profile view [@user]

import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getDb } from "../../../../services/core/database/db.js";
import {
  getAchievementCount,
  getDailyStreak,
  getAfkStatus,
  getTimezone,
  formatTimeInZone,
} from "../profileHelpers.js";
import {
  getTotalWins,
  getTotalGamesPlayed,
} from "../../../../services/stores/gameStats/gameStats.js";
import {
  buildProgressBar,
  getProgression,
} from "../../../../services/stores/progression/progressionStore.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const ephemeral = interaction.options.getBoolean("private") ?? true;
  await interaction.deferReply({ ephemeral });

  const db = getDb();
  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const member = interaction.guild?.members.cache.get(targetUser.id);

  const totalGames = getTotalGamesPlayed(db, targetUser.id);
  const totalWins = getTotalWins(db, targetUser.id);
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const achievements = getAchievementCount(db, targetUser.id);
  const daily = getDailyStreak(db, targetUser.id);
  const afk = getAfkStatus(db, targetUser.id);
  const timezone = getTimezone(db, targetUser.id);
  const progression = getProgression(targetUser.id);

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s Profile`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setColor(member?.displayColor ?? 0x5865f2);

  const accountLines = [
    `📅 **Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
  ];
  if (member?.joinedTimestamp) {
    accountLines.push(
      `🏠 **Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
    );
  }
  if (timezone) {
    accountLines.push(`🕐 **Time:** ${formatTimeInZone(timezone)} (${timezone})`);
  }
  if (afk) {
    accountLines.push(`💤 **AFK:** ${afk.message}`);
  }
  embed.addFields({ name: "📋 Info", value: accountLines.join("\n"), inline: false });

  if (totalGames > 0) {
    embed.addFields({
      name: "🎮 Gaming",
      value: [`Games: **${totalGames}**`, `Wins: **${totalWins}** (${winRate}%)`].join(
        "\n",
      ),
      inline: true,
    });
  }

  if (daily.points > 0 || daily.current > 0) {
    embed.addFields({
      name: "📅 Daily",
      value: [
        `Points: **${daily.points}**`,
        `Streak: **${daily.current}** 🔥`,
        `Best: **${daily.best}** 🏆`,
      ].join("\n"),
      inline: true,
    });
  }

  embed.addFields({
    name: "✨ Progression",
    value: [
      `Level: **${progression.level}**`,
      `XP: **${progression.xp}** total`,
      `[${buildProgressBar(progression.xpIntoLevel, progression.xpForNextLevel)}] ${progression.xpIntoLevel}/${progression.xpForNextLevel}`,
    ].join("\n"),
    inline: true,
  });

  const progressBarLength = 10;
  const filledCount = Math.round(
    (achievements.earned / achievements.total) * progressBarLength,
  );
  const progressBar =
    "█".repeat(filledCount) + "░".repeat(progressBarLength - filledCount);

  embed.addFields({
    name: "🏆 Achievements",
    value: `**${achievements.earned}**/${achievements.total}\n[${progressBar}]`,
    inline: true,
  });

  await interaction.editReply({ embeds: [embed] });
}
