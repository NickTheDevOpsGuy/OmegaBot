// src/services/discord/rateLimit.ts
//
// Simple in-memory rate limiter for commands that can be spammed.
// Resets on bot restart.

const RATE_LIMITS = new Map<string, number>();

const SLOTS_COOLDOWN_MS = 3_000; // 3 seconds between spins
const BLACKJACK_COOLDOWN_MS = 5_000; // 5 seconds between games
const DICE_COOLDOWN_MS = 2_000; // 2 seconds between rolls
const HANGMAN_COOLDOWN_MS = 10_000; // 10 seconds between games

const SLOTS_KEY_PREFIX = "slots:";
const BLACKJACK_KEY_PREFIX = "blackjack:";
const DICE_KEY_PREFIX = "dice:";
const HANGMAN_KEY_PREFIX = "hangman:";

function checkCooldown(userId: string, prefix: string, cooldownMs: number): number {
  const key = `${prefix}${userId}`;
  const last = RATE_LIMITS.get(key) ?? 0;
  const now = Date.now();
  const elapsed = now - last;

  if (elapsed >= cooldownMs) {
    return 0;
  }
  return cooldownMs - elapsed;
}

function recordUse(userId: string, prefix: string): void {
  RATE_LIMITS.set(`${prefix}${userId}`, Date.now());
}

/**
 * Check if user is rate limited for slots.
 * Returns remaining ms if limited, 0 if ok to proceed.
 */
export function checkSlotsCooldown(userId: string): number {
  return checkCooldown(userId, SLOTS_KEY_PREFIX, SLOTS_COOLDOWN_MS);
}

/**
 * Record a slots spin (call after successful spin).
 */
export function recordSlotsSpin(userId: string): void {
  recordUse(userId, SLOTS_KEY_PREFIX);
}

/**
 * Check if user is rate limited for blackjack.
 * Returns remaining ms if limited, 0 if ok to proceed.
 */
export function checkBlackjackCooldown(userId: string): number {
  return checkCooldown(userId, BLACKJACK_KEY_PREFIX, BLACKJACK_COOLDOWN_MS);
}

/**
 * Record a blackjack game start (call when game begins).
 */
export function recordBlackjackGame(userId: string): void {
  recordUse(userId, BLACKJACK_KEY_PREFIX);
}

/**
 * Check if user is rate limited for dice.
 * Returns remaining ms if limited, 0 if ok to proceed.
 */
export function checkDiceCooldown(userId: string): number {
  return checkCooldown(userId, DICE_KEY_PREFIX, DICE_COOLDOWN_MS);
}

/**
 * Record a dice roll (call after successful roll).
 */
export function recordDiceRoll(userId: string): void {
  recordUse(userId, DICE_KEY_PREFIX);
}

/**
 * Check if user is rate limited for hangman.
 * Returns remaining ms if limited, 0 if ok to proceed.
 */
export function checkHangmanCooldown(userId: string): number {
  return checkCooldown(userId, HANGMAN_KEY_PREFIX, HANGMAN_COOLDOWN_MS);
}

/**
 * Record a hangman game start (call when game begins).
 */
export function recordHangmanGame(userId: string): void {
  recordUse(userId, HANGMAN_KEY_PREFIX);
}
