# Commands Overview

This document describes all current and planned slash commands in OmegaBot.

---

## /ping

Health check command.

Purpose:

- Confirms the bot is online
- Useful for verifying permissions and connectivity

---

## /history

Chat playback command.

Behavior:

- Fetches the last N user messages from the current channel
- Filters out bot messages
- Sorts messages oldest → newest
- Sends transcript via DM
- Falls back to a file attachment if over Discord limits

Options:

- `count` (number): How many messages to fetch

---

## /summary

Conversation summarization command.

Behavior:

- Fetches recent messages
- Builds a transcript using the shared transcript builder
- Runs local or LLM summarization (depending on configuration)
- Sends result via DM

Options:

- `count` (number): How many messages to summarize

---

## Planned / Future Commands

- `/faq` — Lookup stored FAQs
- `/github issue` — Fetch GitHub issue details
- `/github pr` — Fetch pull request details
- `/announce pr` — Announce merged PRs
- `/playback` — Paginated chat playback