// src/services/discord/rateLimit.ts
//
// Simple in-memory rate limiter for commands that can be spammed.
// Resets on bot restart.

import {
  SLOTS_COOLDOWN_MS,
  BLACKJACK_COOLDOWN_MS,
  DICE_COOLDOWN_MS,
  DARTS_COOLDOWN_MS,
  HANGMAN_COOLDOWN_MS,
} from "../../constants.js";
import { t, resolveLocale } from "../../i18n/index.js";
import { recordRateLimitHit } from "../metrics/server.js";

const RATE_LIMITS = new Map<string, number>();

const SLOTS_KEY_PREFIX = "slots:";
const BLACKJACK_KEY_PREFIX = "blackjack:";
const DICE_KEY_PREFIX = "dice:";
const DARTS_KEY_PREFIX = "darts:";
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
 * Check if user is rate limited for darts.
 * Returns remaining ms if limited, 0 if ok to proceed.
 */
export function checkDartsCooldown(userId: string): number {
  return checkCooldown(userId, DARTS_KEY_PREFIX, DARTS_COOLDOWN_MS);
}

/**
 * Record a darts throw (call after successful throw).
 */
export function recordDartsThrow(userId: string): void {
  recordUse(userId, DARTS_KEY_PREFIX);
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

/**
 * Format a user-facing cooldown message.
 * Use when rate limit blocks a user - shows "Try again in Xs" clearly.
 * Records rate limit hit to metrics when handler is provided.
 * @param guildLocale - Optional Discord guild preferred locale (e.g. from interaction.guild?.preferredLocale)
 */
export function formatCooldownMessage(
  remainingMs: number,
  cooldownSec: number,
  handler?: string,
  guildLocale?: string | null,
): string {
  if (handler) recordRateLimitHit(handler);
  const seconds = Math.ceil(remainingMs / 1000);
  const locale = resolveLocale(guildLocale);
  return t("rate_limit.cooldown_full", locale, {
    seconds: String(seconds),
    cooldownSec: String(cooldownSec),
  });
}
