# 🧠 Transcript & Summary Design

This document explains how OmegaBot fetches, formats, and delivers message transcripts and summaries.

It is intentionally framework-aware (Discord.js) but logic-focused, so behavior is predictable and reusable.

---

## Goals

- Produce readable, consistent transcripts
- Avoid duplicating formatting logic across commands
- Handle Discord limits gracefully
- Support future enhancements (pagination, timezones, LLM summaries)

---

## Core Concepts

### Transcript

A **transcript** is a formatted, chronological representation of chat messages.

Format:

```
[YYYY-MM-DD HH:mm] username: message content
```

Rules:

- Oldest → newest
- Bot messages excluded
- Empty messages ignored
- 24-hour time
- Locale: `en-GB`
- Default timezone: `UTC`

---

## Transcript Builder (`buildTranscript`)

All transcript formatting lives in a shared helper:

`src/services/transcript/buildTranscript.ts`

### Why this exists

- Prevents duplicated logic between `/history` and `/summary`
- Makes pagination and LLM analysis easier later
- Central place to enforce limits and formatting rules

### Input

```ts
buildTranscript(
  messages: TranscriptMessage[],
  options: TranscriptOptions
)
```

#### `TranscriptMessage` (minimal shape)

```ts
{
  createdTimestamp: number;
  content: string;
  author: {
    username: string;
  }
}
```

#### `TranscriptOptions`

```ts
{
  includeTimestamp: boolean
  includeAuthor: boolean
  maxLines?: number
  maxChars?: number
  timeZone?: string
  locale?: string
}
```

---

## Output

```ts
{
  text: string;
  lineCount: number;
  truncated: boolean;
  tooLong: boolean;
}
```

This allows calling commands to decide:

- DM vs file attachment
- Pagination vs truncation
- User feedback messaging

---

## Discord Limits

Known limits enforced by design:

- **2000 characters** per message
- File upload used as fallback
- DM preferred for privacy

Commands do **not** silently fail when limits are exceeded.

---

## Commands Using Transcripts

| Command    | Purpose                       |
| ---------- | ----------------------------- |
| `/history` | Raw message playback via DM   |
| `/summary` | Transcript → summary pipeline |

Future commands (planned):

- `/playback`
- `/export`
- `/timeline`

---

## Future Enhancements

Planned improvements that this design supports:

- Pagination with buttons
- User-specific timezone support
- Markdown transcript export
- LLM-based highlights and insights

---

## Design Philosophy

> Fetch logic belongs in commands  
> Formatting belongs in services  
> Decisions belong at the edge

This separation keeps features easy to extend without refactoring.
