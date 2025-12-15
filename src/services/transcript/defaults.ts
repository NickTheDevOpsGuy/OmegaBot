// src/services/transcript/defaults.ts

import type { TranscriptOptions } from "./buildTranscript.js";

/**
 * Central place for transcript defaults so commands stay consistent.
 * Commands can override these if they intentionally differ.
 */

// Discord hard limit is 2000 chars. Leave headroom for labels and safety.
export const DISCORD_SAFE_TEXT_LIMIT = 1900;

export const HISTORY_DEFAULTS: TranscriptOptions = {
  includeTimestamp: true,
  includeAuthor: true,
  maxLines: 50,
  maxChars: DISCORD_SAFE_TEXT_LIMIT,
  timeZone: "UTC",
  locale: "en-GB",
};

export const SUMMARY_DEFAULTS: TranscriptOptions = {
  // Summary transcript should be stable for summarizers:
  // author helps a lot, timestamps usually add noise.
  includeTimestamp: false,
  includeAuthor: true,
  maxLines: 50,
  maxChars: DISCORD_SAFE_TEXT_LIMIT,
  timeZone: "UTC",
  locale: "en-GB",
};
