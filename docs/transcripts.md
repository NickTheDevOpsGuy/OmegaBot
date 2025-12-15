# Transcript & Summary Design

This document explains how transcripts and summaries are built in OmegaBot.

---

## Goals

- Human-readable output
- Chronological order
- Consistent formatting across commands
- Reusable and testable helper logic

---

## Transcript Format

Default format:

[YYYY-MM-DD HH:mm] username: message

Rules:
- 24-hour time
- Locale: en-GB
- Timezone: UTC (for now)

---

## buildTranscript Helper

Location:
`src/services/transcript/buildTranscript.ts`

Responsibilities:

- Accept message-like objects
- Format timestamps and authors
- Enforce `maxLines` and `maxChars`
- Return metadata for callers

Returns:

- `text`
- `lineCount`
- `truncated`
- `tooLong`

Does NOT:

- Fetch messages
- Send messages or files
- Perform summarization

---

## Defaults

Centralized in:
`src/services/transcript/defaults.ts`

History defaults:

- includeTimestamp: true
- includeAuthor: true

Summary defaults:

- includeTimestamp: false
- includeAuthor: true

---

## File Fallback Strategy

If transcript exceeds safe Discord limits:
- Generate `.txt` file
- Send via DM
- Confirm delivery via ephemeral reply

---

## Future Enhancements

- User-specific timezones
- Pagination support
- Markdown transcript output