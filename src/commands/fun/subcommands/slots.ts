// src/commands/fun/subcommands/slots.ts
//
// Slot machine game with jackpots and leaderboard.
//
// Features:
// - 8 symbols with weighted probabilities
// - Payouts: 2x-100x (💎 jackpot)
// - Jackpot leaderboard
// - Paytable display
// - Stats: spins, wins, jackpots, biggest_win
//
// Stats are persisted to slots_stats table.

import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import { getDb } from "../../../services/database/db.js";
import {
  checkSlotsCooldown,
  recordSlotsSpin,
} from "../../../services/discord/rateLimit.js";

// Symbols with weights (higher = more common)
const SYMBOLS = [
  { emoji: "🍒", name: "Cherry", weight: 30, payout: 5 },
  { emoji: "🍋", name: "Lemon", weight: 25, payout: 8 },
  { emoji: "🍊", name: "Orange", weight: 20, payout: 10 },
  { emoji: "🍇", name: "Grape", weight: 15, payout: 15 },
  { emoji: "🔔", name: "Bell", weight: 10, payout: 20 },
  { emoji: "⭐", name: "Star", weight: 6, payout: 25 },
  { emoji: "7️⃣", name: "Seven", weight: 3, payout: 50 },
  { emoji: "💎", name: "Diamond", weight: 1, payout: 100 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

function ensureSlotsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS slots_stats (
      user_id TEXT PRIMARY KEY,
      spins INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      jackpots INTEGER NOT NULL DEFAULT 0,
      biggest_win TEXT,
      updated_at INTEGER NOT NULL
    );
  `);
}

type SlotsStats = {
  spins: number;
  wins: number;
  jackpots: number;
  biggestWin: string | null;
  winRate: number;
};

function getStats(userId: string): SlotsStats {
  ensureSlotsTable();
  const db = getDb();

  type Row = {
    spins: number;
    wins: number;
    jackpots: number;
    biggest_win: string | null;
  };
  const row = db
    .prepare(
      `SELECT spins, wins, jackpots, biggest_win FROM slots_stats WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  if (!row) return { spins: 0, wins: 0, jackpots: 0, biggestWin: null, winRate: 0 };

  return {
    spins: row.spins,
    wins: row.wins,
    jackpots: row.jackpots,
    biggestWin: row.biggest_win,
    winRate: row.spins > 0 ? Math.round((row.wins / row.spins) * 100) : 0,
  };
}

function recordSpin(
  userId: string,
  isWin: boolean,
  isJackpot: boolean,
  payout: number,
): void {
  ensureSlotsTable();
  const db = getDb();
  const now = Date.now();

  const current = getStats(userId);
  const currentBiggest = current.biggestWin
    ? parseInt(current.biggestWin.replace("x", ""), 10)
    : 0;
  const newBiggest = payout > currentBiggest ? `${payout}x` : current.biggestWin;

  db.prepare(
    `INSERT INTO slots_stats (user_id, spins, wins, jackpots, biggest_win, updated_at)
     VALUES (?, 1, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       spins = spins + 1,
       wins = wins + ?,
       jackpots = jackpots + ?,
       biggest_win = ?,
       updated_at = ?`,
  ).run(
    userId,
    isWin ? 1 : 0,
    isJackpot ? 1 : 0,
    newBiggest,
    now,
    isWin ? 1 : 0,
    isJackpot ? 1 : 0,
    newBiggest,
    now,
  );
}

function getLeaderboard(limit = 10): Array<{ user_id: string; jackpots: number }> {
  ensureSlotsTable();
  const db = getDb();

  return db
    .prepare(
      `SELECT user_id, jackpots FROM slots_stats 
       WHERE jackpots > 0 
       ORDER BY jackpots DESC 
       LIMIT ?`,
    )
    .all(limit) as Array<{ user_id: string; jackpots: number }>;
}

/* -------------------------------------------------------------------------- */
/* Game Logic                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Spin a single reel using weighted random selection.
 * Higher weight = more likely to appear. Diamond (weight 1) is rarest.
 */
function spinReel(): (typeof SYMBOLS)[number] {
  // Generate random number in range [0, TOTAL_WEIGHT)
  const roll = Math.random() * TOTAL_WEIGHT;
  let cumulative = 0;

  // Walk through symbols, each "owns" a portion of the range
  // proportional to its weight
  for (const symbol of SYMBOLS) {
    cumulative += symbol.weight;
    if (roll < cumulative) {
      return symbol;
    }
  }

  return SYMBOLS[0]; // Fallback (shouldn't happen)
}

/**
 * Calculate payout based on the three reels.
 * Three of a kind pays the symbol's payout multiplier.
 * Two of a kind (adjacent) pays 2x.
 */
function calculatePayout(reels: Array<(typeof SYMBOLS)[number]>): {
  payout: number;
  type: string;
} {
  const [a, b, c] = reels;

  // Three of a kind
  if (a.emoji === b.emoji && b.emoji === c.emoji) {
    const isJackpot = a.emoji === "💎";
    return {
      payout: a.payout,
      type: isJackpot ? "💎 JACKPOT!" : `Three ${a.name}s!`,
    };
  }

  // Two of a kind (first two or last two)
  if (a.emoji === b.emoji) {
    return { payout: 2, type: `Two ${a.name}s` };
  }
  if (b.emoji === c.emoji) {
    return { payout: 2, type: `Two ${b.name}s` };
  }

  return { payout: 0, type: "No match" };
}

/* -------------------------------------------------------------------------- */
/* Command Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    return await runSlots(interaction);
  } catch (err) {
    logger.error({ err, userId: interaction.user.id }, "[slots] handler failed");
    await interaction
      .editReply("Something went wrong with slots. Try again.")
      .catch(() => {});
  }
}

async function runSlots(interaction: ChatInputCommandInteraction): Promise<void> {
  const showStatsFlag = interaction.options.getBoolean("stats") ?? false;
  const showLeaderboard = interaction.options.getBoolean("leaderboard") ?? false;
  const showPaytable = interaction.options.getBoolean("paytable") ?? false;

  // Rate limit spins only (not stats/leaderboard/paytable)
  if (!showStatsFlag && !showLeaderboard && !showPaytable) {
    const remaining = checkSlotsCooldown(interaction.user.id);
    if (remaining > 0) {
      await interaction.editReply(
        `⏱️ Slow down! Try again in **${Math.ceil(remaining / 1000)}** seconds (rate limit: 3s).`,
      );
      return;
    }
  }

  if (showPaytable) {
    const paytableLines = SYMBOLS.map(
      (s) =>
        `${s.emoji} ${s.name.padEnd(8)} - ${s.payout}x (${((s.weight / TOTAL_WEIGHT) * 100).toFixed(1)}%)`,
    );

    await interaction.editReply(
      [
        "🎰 **Slots Paytable**",
        "",
        "Three of a kind payouts:",
        "```",
        ...paytableLines,
        "```",
        "",
        "Two matching symbols: 2x",
      ].join("\n"),
    );
    return;
  }

  if (showLeaderboard) {
    const leaders = getLeaderboard(10);

    if (leaders.length === 0) {
      await interaction.editReply("No jackpot winners yet! Be the first!");
      return;
    }

    const lines = leaders.map(
      (l, i) =>
        `${i + 1}. <@${l.user_id}> - ${l.jackpots} jackpot${l.jackpots === 1 ? "" : "s"}`,
    );

    await interaction.editReply(["🎰 **Jackpot Leaderboard**", "", ...lines].join("\n"));
    return;
  }

  if (showStatsFlag) {
    const stats = getStats(interaction.user.id);

    await interaction.editReply(
      [
        `🎰 **Slots Stats for ${interaction.user}**`,
        "",
        `Spins: ${stats.spins} | Wins: ${stats.wins} (${stats.winRate}%)`,
        `💎 Jackpots: ${stats.jackpots}`,
        stats.biggestWin ? `Biggest Win: ${stats.biggestWin}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return;
  }

  // Spin the reels!
  const userId = interaction.user.id;
  const reels = [spinReel(), spinReel(), spinReel()];
  const { payout, type } = calculatePayout(reels);
  const isWin = payout > 0;
  const isJackpot = payout >= 100;

  logger.info({ userId, payout, isJackpot }, "[slots] spin");

  recordSpin(userId, isWin, isJackpot, payout);
  recordSlotsSpin(userId);

  const reelDisplay = reels.map((r) => r.emoji).join(" | ");

  const embed = new EmbedBuilder()
    .setTitle("🎰 Slot Machine")
    .setDescription(
      ["╔═══════════════╗", `║  ${reelDisplay}  ║`, "╚═══════════════╝"].join("\n"),
    )
    .setColor(isJackpot ? 0xffd700 : isWin ? 0x00ff00 : 0xff6b6b);

  if (isJackpot) {
    embed.addFields({
      name: "🎉 JACKPOT!",
      value: `You hit the **${payout}x** jackpot!`,
      inline: false,
    });
  } else if (isWin) {
    embed.addFields({
      name: "Winner!",
      value: `${type} - **${payout}x** payout!`,
      inline: false,
    });
  } else {
    embed.addFields({ name: "No luck this time", value: "Spin again!", inline: false });
  }

  embed.setFooter({ text: "Use /fun slots stats to see your record" });

  try {
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error({ err, userId }, "[slots] failed to reply");
    throw err;
  }
}
