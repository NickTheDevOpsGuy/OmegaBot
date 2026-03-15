// src/commands/fun/subcommands/slots/gameLogic.ts
// Slot machine symbols, spin, and payout logic.
// 3 reels × N rows (1, 3, or 5). Each row is a payline.

export const REELS = 3;
export const ROW_OPTIONS = [1, 3, 5] as const;
export type RowCount = (typeof ROW_OPTIONS)[number];

export const SYMBOLS = [
  { emoji: "🍒", name: "Cherry", weight: 30, payout: 5 },
  { emoji: "🍋", name: "Lemon", weight: 25, payout: 8 },
  { emoji: "🍊", name: "Orange", weight: 20, payout: 10 },
  { emoji: "🍇", name: "Grape", weight: 15, payout: 15 },
  { emoji: "🔔", name: "Bell", weight: 10, payout: 20 },
  { emoji: "⭐", name: "Star", weight: 6, payout: 25 },
  { emoji: "7️⃣", name: "Seven", weight: 3, payout: 50 },
  { emoji: "💎", name: "Diamond", weight: 1, payout: 100 },
] as const;

export const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

export type Symbol = (typeof SYMBOLS)[number];

/**
 * Spin a single reel using weighted random selection.
 */
export function spinReel(): Symbol {
  const roll = Math.random() * TOTAL_WEIGHT;
  let cumulative = 0;
  for (const symbol of SYMBOLS) {
    cumulative += symbol.weight;
    if (roll < cumulative) return symbol;
  }
  return SYMBOLS[0];
}

/**
 * Payout for one line (three symbols). Three of a kind = symbol payout; two of a kind = 2×.
 */
function payoutForLine(line: [Symbol, Symbol, Symbol]): { payout: number; type: string } {
  const [a, b, c] = line;

  if (a.emoji === b.emoji && b.emoji === c.emoji) {
    const isJackpot = a.emoji === "💎";
    return {
      payout: a.payout,
      type: isJackpot ? "💎 JACKPOT!" : `Three ${a.name}s!`,
    };
  }

  if (a.emoji === b.emoji) return { payout: 2, type: `Two ${a.name}s` };
  if (b.emoji === c.emoji) return { payout: 2, type: `Two ${b.name}s` };

  return { payout: 0, type: "No match" };
}

/** Grid: grid[col][row] = symbol at that reel (column) and row (0 = top). 3 columns, rowCount rows. */
export type Grid = [Symbol[], Symbol[], Symbol[]];

/**
 * Spin a 3×rowCount grid. Each reel is spun rowCount times (top to bottom).
 */
export function spinGrid(rowCount: RowCount): Grid {
  const n = rowCount;
  return [
    Array.from({ length: n }, () => spinReel()),
    Array.from({ length: n }, () => spinReel()),
    Array.from({ length: n }, () => spinReel()),
  ];
}

/**
 * Calculate total payout for the grid. Each row is a payline; payouts are summed.
 */
export function calculatePayout(
  grid: Grid,
  rowCount: number,
): { payout: number; type: string; lineResults: { payout: number; type: string }[] } {
  const lineResults: { payout: number; type: string }[] = [];
  for (let row = 0; row < rowCount; row++) {
    const line = [grid[0][row], grid[1][row], grid[2][row]] as [Symbol, Symbol, Symbol];
    lineResults.push(payoutForLine(line));
  }
  const totalPayout = lineResults.reduce((sum, r) => sum + r.payout, 0);

  const winParts = lineResults
    .filter((r) => r.payout > 0)
    .map((r) => `${r.type} (${r.payout}×)`);
  const type = winParts.length > 0 ? winParts.join(" · ") : "No match";

  return { payout: totalPayout, type, lineResults };
}
