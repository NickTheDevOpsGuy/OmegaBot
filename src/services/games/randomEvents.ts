// src/services/games/randomEvents.ts
//
// Rare bonus events for games (Lucky Spin, Double XP, Bonus Coins, Jackpot Boost).
// Configurable probability; events are rare by default.

export type RandomEventKind =
  | "lucky_spin"
  | "double_xp"
  | "bonus_coins"
  | "jackpot_boost"
  | "none";

export type RandomEventConfig = {
  /** Probability 0–1 that any event triggers (before kind roll). Default 0.02 (2%). */
  triggerChance: number;
  /** Relative weights for each event when one triggers. "none" = no event. */
  weights: Partial<Record<RandomEventKind, number>>;
};

const DEFAULT_CONFIG: RandomEventConfig = {
  triggerChance: 0.02,
  weights: {
    lucky_spin: 1,
    double_xp: 1,
    bonus_coins: 1,
    jackpot_boost: 0.5,
    none: 2,
  },
};

export type RandomEventResult = {
  kind: RandomEventKind;
  /** Multiplier for XP (e.g. 2 for double XP). */
  xpMultiplier: number;
  /** Multiplier for payout/coins (e.g. 1.5). */
  payoutMultiplier: number;
  /** User-facing short label. */
  label: string;
};

const EVENT_DEFS: Record<Exclude<RandomEventKind, "none">, Omit<RandomEventResult, "kind">> = {
  lucky_spin: {
    xpMultiplier: 1,
    payoutMultiplier: 1.5,
    label: "🍀 Lucky Spin!",
  },
  double_xp: {
    xpMultiplier: 2,
    payoutMultiplier: 1,
    label: "✨ Double XP!",
  },
  bonus_coins: {
    xpMultiplier: 1,
    payoutMultiplier: 2,
    label: "🪙 Bonus Coins!",
  },
  jackpot_boost: {
    xpMultiplier: 1.25,
    payoutMultiplier: 1.25,
    label: "💎 Jackpot Boost!",
  },
};

/**
 * Roll for a rare random event. Returns "none" most of the time.
 * Use before applying XP/payout so multipliers can be applied.
 */
export function rollRandomEvent(
  config: Partial<RandomEventConfig> = {},
): RandomEventResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (Math.random() >= cfg.triggerChance) {
    return { kind: "none", xpMultiplier: 1, payoutMultiplier: 1, label: "" };
  }

  const kinds: RandomEventKind[] = [
    "lucky_spin",
    "double_xp",
    "bonus_coins",
    "jackpot_boost",
    "none",
  ];
  const weight = (k: RandomEventKind) => cfg.weights[k] ?? 0;
  const total = kinds.reduce((s, k) => s + weight(k), 0);
  let r = Math.random() * total;
  for (const k of kinds) {
    r -= weight(k);
    if (r <= 0 && k !== "none") {
      const def = EVENT_DEFS[k];
      return { kind: k, ...def };
    }
    if (r <= 0) break;
  }
  return { kind: "none", xpMultiplier: 1, payoutMultiplier: 1, label: "" };
}
