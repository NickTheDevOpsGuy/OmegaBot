// src/commands/fun/subcommands/slots/gameLogic.ts
// Slot machine symbols, spin, and payout logic.

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
 * Calculate payout based on the three reels.
 * Three of a kind pays the symbol's payout multiplier.
 * Two of a kind (adjacent) pays 2x.
 */
export function calculatePayout(reels: [Symbol, Symbol, Symbol]): {
  payout: number;
  type: string;
} {
  const [a, b, c] = reels;

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
