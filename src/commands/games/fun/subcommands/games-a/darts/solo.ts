// src/commands/fun/subcommands/darts/solo.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { DARTS_COOLDOWN_MS } from "../../../../../../utils/constants.js";
import { logger } from "../../../../../../utils/logger.js";
import {
  checkDartsCooldown,
  formatCooldownMessage,
  recordDartsThrow,
} from "../../../../../../services/discord/discord/rateLimit/index.js";
import {
  safeMessageEdit,
  notifyGameMessageGone,
} from "../../../../../../services/discord/discord/safeReply.js";
import { getNewlyUnlockedAchievementLine } from "../../../../achievements/achievements.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import {
  getBestRoundLeaderboard,
  get180Leaderboard,
  getStats,
  recordSoloThrow,
} from "./dartsStore.js";
import { DARTBOARD_ART, doThrow, formatThrowLines } from "./gameLogic.js";
import {
  buildMilestoneLine,
  buildRankTeaser,
  findLeaderboardRank,
} from "../../shared/gameFeedback.js";
import { awardXp } from "../../../../../../services/stores/progression/progressionStore.js";

function buildThrowEmbed(
  hits: ReturnType<typeof doThrow>["hits"],
  score: number,
  is180: boolean,
  extraLines: string[] = [],
): EmbedBuilder {
  const throwLines = formatThrowLines(hits, score);
  const embed = new EmbedBuilder()
    .setTitle("🎯 Darts")
    .setDescription([DARTBOARD_ART, "", throwLines.join("\n")].join("\n"))
    .setColor(is180 ? 0xffd700 : score >= 100 ? 0x22c55e : 0x64748b);
  if (extraLines.length > 0) embed.setFooter({ text: extraLines.join(" • ") });
  return embed;
}

function buildSoloFeedback(
  userId: string,
  score: number,
  is180: boolean,
  xpLine?: string,
  achievementLine?: string,
): string[] {
  const stats = getStats(userId);
  const lines = [
    buildMilestoneLine(stats.throws - 1, stats.throws, [1, 10, 25, 50], "darts rounds"),
    buildMilestoneLine(
      Math.max(0, stats.count180 - (is180 ? 1 : 0)),
      stats.count180,
      [1, 3, 5],
      "180s",
    ),
    score >= stats.bestRound
      ? buildRankTeaser(
          findLeaderboardRank(
            getBestRoundLeaderboard(25),
            (row) => row.user_id === userId,
          ),
          "best-round darts",
        )
      : undefined,
    is180
      ? buildRankTeaser(
          findLeaderboardRank(get180Leaderboard(25), (row) => row.user_id === userId),
          "180",
        )
      : undefined,
    xpLine,
    achievementLine,
    "Try /fun darts leaderboard:best for the full board.",
  ];
  return lines.filter((line): line is string => Boolean(line));
}

export async function runSoloThrow(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const remaining = checkDartsCooldown(interaction.user.id);
  if (remaining > 0) {
    await interaction.editReply(
      formatCooldownMessage(
        remaining,
        DARTS_COOLDOWN_MS / 1000,
        "darts",
        interaction.guild?.preferredLocale ?? null,
      ),
    );
    return;
  }

  const { hits, score, is180 } = doThrow();
  const statsBefore = getStats(interaction.user.id);
  recordDartsThrow(interaction.user.id);
  let xpLine: string | undefined;
  const achievementLine = is180
    ? getNewlyUnlockedAchievementLine(interaction.user.id, getDb(), () => {
        recordSoloThrow(interaction.user.id, score, is180);
        const xpResult = awardXp(interaction.user.id, 30);
        xpLine = xpResult.leveledUp
          ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
          : `✨ +${xpResult.amount} XP`;
      })
    : (recordSoloThrow(interaction.user.id, score, is180),
      (() => {
        const xpResult = awardXp(interaction.user.id, score >= 100 ? 18 : 10);
        xpLine = xpResult.leveledUp
          ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
          : `✨ +${xpResult.amount} XP`;
        return undefined;
      })());

  const embed = buildThrowEmbed(
    hits,
    score,
    is180,
    buildSoloFeedback(
      interaction.user.id,
      Math.max(score, statsBefore.bestRound),
      is180,
      xpLine,
      achievementLine,
    ),
  );
  const throwAgainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("darts-solo-again")
      .setLabel("Throw again")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🎯"),
  );
  const message = await interaction.editReply({
    embeds: [embed],
    components: [throwAgainRow],
  });

  logger.info(
    { userId: interaction.user.id, hits: hits.map((h) => h.value), score },
    "[darts] solo throw complete",
  );

  try {
    const againClick = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) =>
        i.user.id === interaction.user.id && i.customId === "darts-solo-again",
      time: 30_000,
    });
    await againClick.deferUpdate();
    const remaining2 = checkDartsCooldown(interaction.user.id);
    if (remaining2 > 0) {
      const ok = await safeMessageEdit(
        message,
        {
          embeds: [embed],
          components: [],
          content: `⏱️ Wait ${remaining2}s before throwing again.`,
        },
        "darts.solo.cooldown",
        interaction,
      ).catch(() => false);
      if (!ok) await notifyGameMessageGone(againClick, "darts").catch(() => {});
      return;
    }
    const { hits: hits2, score: score2, is180: is1802 } = doThrow();
    const statsBefore2 = getStats(interaction.user.id);
    recordDartsThrow(interaction.user.id);
    let xpLine2: string | undefined;
    const achievementLine2 = is1802
      ? getNewlyUnlockedAchievementLine(interaction.user.id, getDb(), () => {
          recordSoloThrow(interaction.user.id, score2, is1802);
          const xpResult = awardXp(interaction.user.id, 30);
          xpLine2 = xpResult.leveledUp
            ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
            : `✨ +${xpResult.amount} XP`;
        })
      : (recordSoloThrow(interaction.user.id, score2, is1802),
        (() => {
          const xpResult = awardXp(interaction.user.id, score2 >= 100 ? 18 : 10);
          xpLine2 = xpResult.leveledUp
            ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
            : `✨ +${xpResult.amount} XP`;
          return undefined;
        })());
    const embed2 = buildThrowEmbed(
      hits2,
      score2,
      is1802,
      buildSoloFeedback(
        interaction.user.id,
        Math.max(score2, statsBefore2.bestRound),
        is1802,
        xpLine2,
        achievementLine2,
      ),
    );
    const ok = await safeMessageEdit(
      message,
      { embeds: [embed2], components: [] },
      "darts.solo.again",
      interaction,
    ).catch(() => false);
    if (!ok) await notifyGameMessageGone(againClick, "darts").catch(() => {});
  } catch {
    // Timeout
  }
}
