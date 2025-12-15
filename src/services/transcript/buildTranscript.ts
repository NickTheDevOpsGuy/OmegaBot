// src/services/transcript/buildTranscript.ts

import { formatTimestamp } from "../time/formatTimestamp.js";

/**
 * Minimal shape required from a Discord message
 * so this helper stays framework-agnostic.
 */
export type TranscriptMessage = {
  createdTimestamp: number;
  content: string;
  author: { username: string };
};

export type TranscriptOptions = {
  includeTimestamp: boolean;
  includeAuthor: boolean;
  maxLines?: number;
  maxChars?: number;
  timeZone?: string;
  locale?: string;
};

export type TranscriptResult = {
  text: string;
  lineCount: number;
  truncated: boolean;
  tooLong: boolean;
};

/**
 * Builds a readable transcript from a list of messages.
 * Responsible ONLY for formatting + truncation rules.
 */
export function buildTranscript(
  messages: TranscriptMessage[],
  options: TranscriptOptions,
): TranscriptResult {
  const {
    includeTimestamp,
    includeAuthor,
    maxLines,
    maxChars,
    timeZone = "UTC",
    locale = "en-GB",
  } = options;

  const lines: string[] = [];
  let truncated = false;
  let tooLong = false;

  for (const message of messages) {
    if (!message?.content) continue;

    const parts: string[] = [];

    if (includeTimestamp) {
      const ts = formatTimestamp(message.createdTimestamp, timeZone, locale);
      parts.push(`[${ts}]`);
    }

    if (includeAuthor) {
      parts.push(`${message.author.username}:`);
    }

    parts.push(message.content.trim());

    const line = parts.join(" ");
    lines.push(line);

    if (maxLines && lines.length >= maxLines) {
      truncated = true;
      break;
    }

    // Cheaper than joining every iteration: track length incrementally.
    if (maxChars) {
      const joinedLen =
        lines.reduce((acc, l) => acc + l.length, 0) + Math.max(0, lines.length - 1);
      if (joinedLen >= maxChars) {
        tooLong = true;
        break;
      }
    }
  }

  return {
    text: lines.join("\n"),
    lineCount: lines.length,
    truncated,
    tooLong,
  };
}