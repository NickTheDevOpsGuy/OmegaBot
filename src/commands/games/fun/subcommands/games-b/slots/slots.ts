// src/commands/fun/subcommands/slots.ts
//
// Slot machine game with jackpots and leaderboard.
// Game logic in slots/gameLogic.ts, stats in slots/slotsStore.ts.

import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { SLOTS_COOLDOWN_MS } from "../../../../../../utils/constants.js";
import { errMessage, getUserFacingReason } from "../../../../../../utils/errors.js";
import { logger } from "../../../../../../utils/logger.js";
import {
  checkSlotsCooldown,
  formatCooldownMessage,
  recordSlotsSpin,
} from "../../../../../../services/discord/discord/rateLimit/index.js";
import { getNewlyUnlockedAchievementLine } from "../../../../achievements/achievements.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import {
  SYMBOLS,
  TOTAL_WEIGHT,
  type Symbol,
  spinReel,
  calculatePayout,
} from "./gameLogic.js";
import { getStats, getLeaderboard, recordSpin } from "./slotsStore.js";
import {
  buildMilestoneLine,
  buildRankTeaser,
  findLeaderboardRank,
} from "../../shared/gameFeedback.js";
import { awardXp } from "../../../../../../services/stores/progression/progressionStore.js";

const SPIN_FRAMES = 6;
const SPIN_DELAY_MS = 280;

function randomSymbol(): Symbol {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]!;
}

function buildReelBox(reels: [Symbol, Symbol, Symbol]): string[] {
  return [
    "┌─────────┬─────────┬─────────┐",
    `│   ${reels[0].emoji}   │   ${reels[1].emoji}   │   ${reels[2].emoji}   │`,
    "└─────────┴─────────┴─────────┘",
    "",
    reels.map((r) => r.emoji).join(" │ "),
  ];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    return await runSlots(interaction);
  } catch (err) {
    logger.error(
      { err, userId: interaction.user.id },
      `[slots] slots handler threw: ${errMessage(err)}`,
    );
    await interaction
      .editReply(`❌ Slots had a hiccup: ${getUserFacingReason(err)}`)
      .catch(() => {});
  }
}

async function runSlots(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const showLeaderboard = interaction.options.getBoolean("leaderboard") ?? false;
  const showPaytable = interaction.options.getBoolean("paytable") ?? false;

  if (!showStatsFlag && !showLeaderboard && !showPaytable) {
    const remaining = checkSlotsCooldown(interaction.user.id);
    if (remaining > 0) {
      await interaction.editReply(
        formatCooldownMessage(
          remaining,
          SLOTS_COOLDOWN_MS / 1000,
          "slots",
          interaction.guild?.preferredLocale ?? null,
        ),
      );
      return;
    }
  }

  if (showPaytable) {
    const paytableLines = SYMBOLS.map(
      (s) =>
        `${s.emoji} ${s.name.padEnd(8)} — **${s.payout}×** (${((s.weight / TOTAL_WEIGHT) * 100).toFixed(1)}%)`,
    );
    const embed = new EmbedBuilder()
      .setTitle("🎰 Slots Paytable")
      .setDescription(
        [
          "**Three of a kind**",
          "```",
          ...paytableLines,
          "```",
          "",
          "Two matching: **2×**",
        ].join("\n"),
      )
      .setColor(0x5865f2);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (showLeaderboard) {
    const leaders = getLeaderboard(10);
    const embed = new EmbedBuilder()
      .setTitle("🎰 Jackpot Leaderboard")
      .setColor(0xffd700);
    if (leaders.length === 0) {
      embed.setDescription("No jackpot winners yet! Be the first!");
    } else {
      embed.setDescription(
        leaders
          .map(
            (l, i) =>
              `${i + 1}. <@${l.user_id}> — ${l.jackpots} jackpot${l.jackpots === 1 ? "" : "s"}`,
          )
          .join("\n"),
      );
    }
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (showStatsFlag) {
    const stats = getStats(interaction.user.id);
    const embed = new EmbedBuilder()
      .setTitle(`🎰 Slots — ${interaction.user.username}`)
      .setDescription(
        [
          `Spins: **${stats.spins}** | Wins: **${stats.wins}** (${stats.winRate}%)`,
          `💎 Jackpots: **${stats.jackpots}**`,
          stats.biggestWin ? `Biggest win: **${stats.biggestWin}×**` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .setColor(0x22c55e);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const userId = interaction.user.id;
  const statsBefore = getStats(userId);
  const reels: [Symbol, Symbol, Symbol] = [spinReel(), spinReel(), spinReel()];
  const { payout, type } = calculatePayout(reels);
  const isWin = payout > 0;
  const isJackpot = payout >= 100;

  logger.info({ userId, payout, isJackpot }, "[slots] spin");

  let achievementLine: string | undefined;
  let xpLine: string | undefined;
  if (isJackpot) {
    achievementLine = getNewlyUnlockedAchievementLine(userId, getDb(), () => {
      recordSpin(userId, isWin, isJackpot, payout);
      const xpResult = awardXp(userId, 40);
      xpLine = xpResult.leveledUp
        ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
        : `✨ +${xpResult.amount} XP`;
    });
  } else {
    recordSpin(userId, isWin, isJackpot, payout);
    const xpResult = awardXp(userId, isWin ? 12 : 5);
    xpLine = xpResult.leveledUp
      ? `✨ +${xpResult.amount} XP • Level ${xpResult.after.level}!`
      : `✨ +${xpResult.amount} XP`;
  }
  recordSlotsSpin(userId);
  const statsAfter = getStats(userId);

  const milestoneLine =
    buildMilestoneLine(statsBefore.wins, statsAfter.wins, [1, 5, 10, 25], "slots wins") ??
    buildMilestoneLine(
      statsBefore.jackpots,
      statsAfter.jackpots,
      [1, 3, 5, 10],
      "jackpots",
    );
  const rankLine = isJackpot
    ? buildRankTeaser(
        findLeaderboardRank(getLeaderboard(25), (row) => row.user_id === userId),
        "jackpot",
      )
    : undefined;

  // Spinning animation: show random reels then reveal result
  const footerLines = [
    "3-of-kind: 5–100× │ Two match: 2× │ /fun slots stats │ /fun utility leaderboard",
  ];
  if (milestoneLine) footerLines.push(milestoneLine);
  if (rankLine) footerLines.push(rankLine);
  if (xpLine) footerLines.push(xpLine);
  if (achievementLine) footerLines.push(achievementLine);

  for (let frame = 0; frame < SPIN_FRAMES; frame++) {
    const isLast = frame === SPIN_FRAMES - 1;
    const showReels: [Symbol, Symbol, Symbol] = isLast
      ? reels
      : [randomSymbol(), randomSymbol(), randomSymbol()];

    if (isLast) {
      const embed = new EmbedBuilder()
        .setTitle("🎰 Slot Machine")
        .setDescription(buildReelBox(reels).join("\n"))
        .setColor(isJackpot ? 0xffd700 : isWin ? 0x22c55e : 0x64748b);

      if (isJackpot) {
        embed.addFields({
          name: "💎 JACKPOT!",
          value: `**${payout}×** — ${type}\n*You hit the top tier!*`,
          inline: false,
        });
      } else if (isWin) {
        embed.addFields({
          name: "✨ Winner!",
          value: `${type} — **${payout}×**`,
          inline: false,
        });
      } else {
        embed.addFields({
          name: "—",
          value: "No match this spin. Try again!",
          inline: false,
        });
      }
      embed.setFooter({ text: footerLines.join(" • ") });
      await interaction.editReply({ embeds: [embed] });
    } else {
      const spinEmbed = new EmbedBuilder()
        .setTitle("🎰 Spinning…")
        .setDescription([...buildReelBox(showReels), "*spinning…*"].join("\n"))
        .setColor(0x5865f2);
      await interaction.editReply({ embeds: [spinEmbed] });
      await sleep(SPIN_DELAY_MS);
    }
  }
}
