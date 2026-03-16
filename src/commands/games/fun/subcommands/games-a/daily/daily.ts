// src/commands/fun/subcommands/daily.ts
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getContextLogger } from "../../../../../../services/core/logging/requestContext.js";
import { logger } from "../../../../../../utils/logger.js";
import { getStats, doCheckIn, getDailyLeaderboard } from "./dailyStore.js";
import { getNewlyUnlockedAchievementLine } from "../../../../achievements/achievements.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import { buildRankTeaser, findLeaderboardRank } from "../../shared/gameFeedback.js";
import { awardXp } from "../../../../../../services/stores/progression/progressionStore.js";

export { doCheckIn } from "./dailyStore.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStats = interaction.options.getBoolean("stats") ?? false;
  const showLeaderboard = interaction.options.getBoolean("leaderboard") ?? false;

  try {
    if (showLeaderboard) {
      const leaders = getDailyLeaderboard(10);

      if (leaders.length === 0) {
        await interaction.editReply(
          "📅 **Daily Leaderboard**\n\nNo check-ins yet! Be the first with `/fun daily`",
        );
        return;
      }

      const medals = ["🥇", "🥈", "🥉"];
      const lines = ["📅 **Daily Check-in Leaderboard**", ""];

      leaders.forEach((l, i) => {
        const prefix = medals[i] ?? `${i + 1}.`;
        const streakEmoji = l.streak >= 7 ? "🔥" : "";
        lines.push(`${prefix} <@${l.userId}> — ${l.points} pts ${streakEmoji}`);
        lines.push(
          `   └ Streak: ${l.streak} days | Best: ${l.bestStreak} | Total: ${l.totalCheckins}`,
        );
      });

      await interaction.editReply(lines.join("\n"));
      return;
    }

    if (showStats) {
      const stats = getStats(interaction.user.id);

      const embed = new EmbedBuilder()
        .setTitle("📅 Daily Check-in Stats")
        .setColor(stats.streak >= 7 ? 0xf59e0b : 0x5865f2)
        .addFields(
          { name: "🔥 Current Streak", value: `${stats.streak} days`, inline: true },
          { name: "⭐ Best Streak", value: `${stats.bestStreak} days`, inline: true },
          { name: "📊 Total Points", value: `${stats.points}`, inline: true },
          { name: "✅ Total Check-ins", value: `${stats.totalCheckins}`, inline: true },
        );

      if (stats.canCheckIn) {
        embed.setFooter({ text: "✨ You can check in now!" });
      } else {
        embed.setFooter({
          text: `⏰ Next check-in available in ${stats.hoursUntilReset}h • resets at day rollover`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const stats = getStats(interaction.user.id);

    if (!stats.canCheckIn) {
      await interaction.editReply(
        `⏰ You've already checked in today!\n\nCome back in **${stats.hoursUntilReset} hours** to continue your streak.\n🔥 Current streak: **${stats.streak} days**\n📊 See the standings: **/fun daily leaderboard:true**`,
      );
      return;
    }

    let result!: ReturnType<typeof doCheckIn>;
    let xpAwardLine: string | undefined;
    const achievementLine = getNewlyUnlockedAchievementLine(
      interaction.user.id,
      getDb(),
      () => {
        result = doCheckIn(interaction.user.id);
        const xpResult = awardXp(interaction.user.id, 20 + Math.min(result.streak, 10));
        xpAwardLine = xpResult.leveledUp
          ? `✨ +${xpResult.amount} XP • Level up! You're now level ${xpResult.after.level}.`
          : `✨ +${xpResult.amount} XP`;
      },
    );

    const streakEmoji = result.streak >= 30 ? "👑" : result.streak >= 7 ? "🔥" : "✨";
    const rankLine = buildRankTeaser(
      findLeaderboardRank(
        getDailyLeaderboard(25),
        (row) => row.userId === interaction.user.id,
      ),
      "daily check-in",
    );

    const embed = new EmbedBuilder()
      .setTitle("📅 Daily Check-in!")
      .setColor(0x57f287)
      .setDescription(
        [
          `**+${result.points} points** earned!`,
          "",
          `${streakEmoji} **Streak: ${result.streak} days**`,
          result.isNewBest ? "🎉 **New personal best!**" : "",
          result.milestone ?? "",
          xpAwardLine ?? "",
          achievementLine ?? "",
          rankLine ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .setFooter({
        text: "Come back tomorrow to keep your streak • /fun daily stats:true • /fun daily leaderboard:true",
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    if (err instanceof Error && err.message === "Already checked in today") {
      const stats = getStats(interaction.user.id);
      await interaction.editReply(
        `⏰ You've already checked in today!\n\nCome back in **${stats.hoursUntilReset} hours**.\n🔥 Current streak: **${stats.streak} days**\n📊 See the standings: **/fun daily leaderboard:true**`,
      );
      return;
    }

    getContextLogger().error(
      { err, userId: interaction.user.id },
      "[fun/daily] daily check-in handler threw",
    );
    await interaction.editReply(
      "Daily check-in didn't go through. Try again in a moment.",
    );
  }
}
