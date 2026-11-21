// src/commands/fun/subcommands/slots.ts
//
// Slot machine game with jackpots and leaderboard.
// Game logic in slots/gameLogic.ts, stats in slots/slotsStore.ts.

import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { SLOTS_COOLDOWN_MS } from "../../../../../../utils/constants.js";
import { getContextLogger } from "../../../../../../services/core/logging/requestContext.js";
import { errMessage, getUserFacingReason } from "../../../../../../utils/errors.js";
import { logger } from "../../../../../../utils/logger.js";
import {
  checkSlotsCooldown,
  formatCooldownMessage,
  recordSlotsSpin,
} from "../../../../../../services/discord/discord/rateLimit/index.js";
import { getNewlyUnlockedAchievementLine } from "../../../../achievements/achievements.js";
import { getDb } from "../../../../../../services/core/database/db.js";
import { buildGameResultEmbed } from "../../../../../../services/games/gameResultRenderer.js";
import { rollRandomEvent } from "../../../../../../services/games/randomEvents.js";
import {
  SYMBOLS,
  TOTAL_WEIGHT,
  type Symbol,
  type Grid,
  type RowCount,
  spinGrid,
  calculatePayout,
} from "./gameLogic.js";
import { getStats, getLeaderboard, recordSpin } from "./slotsStore.js";
import {
  buildMilestoneLine,
  buildRankTeaser,
  findLeaderboardRank,
} from "../../shared/gameFeedback.js";
import type { AwardXpResult } from "../../../../../../services/stores/progression/progressionStore.js";
import { awardXp } from "../../../../../../services/stores/progression/progressionStore.js";

const SPIN_FRAMES = 6;
const SPIN_DELAY_MS = 280;

function randomSymbol(): Symbol {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]!;
}

function parseRowsOption(n: number | null): RowCount {
  if (n === 1 || n === 5) return n;
  return 3;
}

function randomGrid(rowCount: RowCount): Grid {
  const n = rowCount;
  return [
    Array.from({ length: n }, () => randomSymbol()),
    Array.from({ length: n }, () => randomSymbol()),
    Array.from({ length: n }, () => randomSymbol()),
  ];
}

/** Clean grid: one line per payline, light separator (e.g. "🍊 │ 🍒 │ 🍋"). */
function buildReelLines(grid: Grid, rowCount: number): string[] {
  return Array.from({ length: rowCount }, (_, r) =>
    [grid[0][r].emoji, grid[1][r].emoji, grid[2][r].emoji].join(" │ "),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    return await runSlots(interaction);
  } catch (err) {
    getContextLogger().error(
      { err, userId: interaction.user.id },
      `[slots] slots handler threw: ${errMessage(err)}`,
    );
    await interaction
      .editReply(`❌ Slots had a hiccup: ${getUserFacingReason(err)}`)
      .catch(() => {});
  }
}

async function runSlots(interaction: ChatInputCommandInteraction): Promise<void> {
  const legacyShowStats = interaction.options.getBoolean("stats") ?? false;
  const legacyShowLeaderboard = interaction.options.getBoolean("leaderboard") ?? false;
  const legacyShowPaytable = interaction.options.getBoolean("paytable") ?? false;
  const view =
    interaction.options.getString("view") ??
    (legacyShowPaytable
      ? "paytable"
      : legacyShowLeaderboard
        ? "leaderboard"
        : legacyShowStats
          ? "stats"
          : "spin");
  const showStatsFlag = view === "stats";
  const showLeaderboard = view === "leaderboard";
  const showPaytable = view === "paytable";

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
        `${s.emoji} **${s.name}** — **${s.payout}×** (${((s.weight / TOTAL_WEIGHT) * 100).toFixed(1)}%)`,
    );
    const embed = new EmbedBuilder()
      .setTitle("🎰 Slots Paytable")
      .setDescription(
        [
          "Choose **1, 3, or 5 rows** (paylines). Per line:",
          "**Three of a kind** → symbol payout below. **Two matching** → **2×**",
          "",
          ...paytableLines,
          "",
          "**Two matching** on a line: **2×**",
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
  const rows = parseRowsOption(interaction.options.getInteger("rows"));
  const statsBefore = getStats(userId);
  const randomEvent = rollRandomEvent();
  const grid = spinGrid(rows);
  const { payout: basePayout, type } = calculatePayout(grid, rows);
  const payout = Math.max(0, Math.floor(basePayout * randomEvent.payoutMultiplier));
  const isWin = payout > 0;
  const isJackpot = payout >= 100;

  logger.info({ userId, payout, isJackpot, event: randomEvent.kind }, "[slots] spin");

  const baseXp = isJackpot ? 40 : isWin ? 12 : 5;
  const xpAmount = Math.max(0, Math.floor(baseXp * randomEvent.xpMultiplier));

  let achievementLine: string | undefined;
  let xpResult: AwardXpResult = awardXp(userId, 0);
  if (isJackpot) {
    achievementLine = getNewlyUnlockedAchievementLine(userId, getDb(), () => {
      recordSpin(userId, isWin, isJackpot, payout);
      xpResult = awardXp(userId, xpAmount);
    });
  } else {
    recordSpin(userId, isWin, isJackpot, payout);
    xpResult = awardXp(userId, xpAmount);
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

  const rewardLines: string[] = [];
  if (randomEvent.label) rewardLines.push(randomEvent.label);

  const paylineLabel = `${rows} payline${rows === 1 ? "" : "s"}`;
  const outcomeMessage = isJackpot
    ? `**${payout}×** — ${type}\n*You hit the top tier!*`
    : isWin
      ? `${type} — **${payout}×**`
      : "No match this spin. Try again!";

  for (let frame = 0; frame < SPIN_FRAMES; frame++) {
    const isLast = frame === SPIN_FRAMES - 1;
    const showGrid: Grid = isLast ? grid : randomGrid(rows);

    if (isLast) {
      const embed = buildGameResultEmbed({
        gameTitle: "🎰 Slot Machine",
        subtitle: paylineLabel,
        outcome: isWin ? "win" : "loss",
        boardLines: buildReelLines(grid, rows),
        outcomeMessage,
        rewardLines: rewardLines.length > 0 ? rewardLines : undefined,
        xpGained: xpResult.amount,
        levelUpMessage: xpResult.leveledUp ? `Level ${xpResult.after.level}!` : undefined,
        leaderboardSummary: rankLine ?? undefined,
        achievementUnlocked: achievementLine,
        milestoneLine: milestoneLine ?? undefined,
        footerHints: [
          "Play again: /fun slots",
          "Stats: /fun slots view:stats",
          "Leaderboard: /fun utility leaderboard",
        ],
        color: isJackpot ? 0xffd700 : isWin ? 0x22c55e : 0x64748b,
      });
      await interaction.editReply({ embeds: [embed] });
    } else {
      const spinEmbed = new EmbedBuilder()
        .setTitle("🎰 Spinning…")
        .setDescription([...buildReelLines(showGrid, rows), "", "*spinning…*"].join("\n"))
        .setColor(0x5865f2);
      await interaction.editReply({ embeds: [spinEmbed] });
      await sleep(SPIN_DELAY_MS);
    }
  }
}
