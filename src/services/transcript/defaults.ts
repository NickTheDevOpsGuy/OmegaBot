// src/services/transcript/defaults.ts

import type { TranscriptOptions } from "./buildTranscript.js";

/**
 * Discord hard limit is 2000 characters.
 * Leave headroom so we never accidentally overflow.
 */
export const DISCORD_SAFE_TEXT_LIMIT = 1900;

/**
 * Defaults for /history
 * History is meant to be readable playback.
 */
export const HISTORY_DEFAULTS: TranscriptOptions = {
  includeTimestamp: true,
  includeAuthor: true,
  maxLines: 50,
  maxChars: DISCORD_SAFE_TEXT_LIMIT,
  timeZone: "UTC",
  locale: "en-GB",
};

/**
 * Defaults for /summary
 * Summary prefers signal over noise.
 */
export const SUMMARY_DEFAULTS: TranscriptOptions = {
  includeTimestamp: false,
  includeAuthor: true,
  maxLines: 50,
  maxChars: DISCORD_SAFE_TEXT_LIMIT,
  timeZone: "UTC",
  locale: "en-GB",
};