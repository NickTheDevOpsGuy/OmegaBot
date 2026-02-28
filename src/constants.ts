// src/constants.ts
//
// Shared timeouts and limits used across commands.
// Centralizing these makes tuning easier and keeps behavior consistent.

/** 1 hour - game timeout for Blackjack, Hangman, Wordle */
export const GAME_TIMEOUT_MS = 3_600_000;

/** 24 hours - PvP challenge timeout (RPS, Darts) so the other player has time to see and respond */
export const CHALLENGE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/** 30 minutes - per-move timeout for Connect 4, Tic Tac Toe (PvP); gives the other user time to play */
export const MOVE_TIMEOUT_MS = 30 * 60 * 1000;

/** 1 minute - warning before move timeout (Connect 4, Tic Tac Toe) */
export const WARNING_BEFORE_MS = 60_000;

/** 30 seconds - trivia question timeout */
export const TRIVIA_QUESTION_TIMEOUT_MS = 30_000;

/** 60 seconds - Wordle modal submit timeout, Would You Rather vote timeout */
export const SHORT_TIMEOUT_MS = 60_000;

/** Tic Tac Toe vs bot: 90 minutes max (9 moves × 10 min equivalent) */
export const TICTACTOE_VS_BOT_TIMEOUT_MS = MOVE_TIMEOUT_MS * 9;

/* -------------------------------------------------------------------------- */
/* Rate limit cooldowns (seconds, for display)                                */
/* -------------------------------------------------------------------------- */

export const SLOTS_COOLDOWN_MS = 3_000; // 3 seconds
export const BLACKJACK_COOLDOWN_MS = 5_000; // 5 seconds
export const DICE_COOLDOWN_MS = 2_000; // 2 seconds
export const DARTS_COOLDOWN_MS = 2_000; // 2 seconds
export const HANGMAN_COOLDOWN_MS = 10_000; // 10 seconds
