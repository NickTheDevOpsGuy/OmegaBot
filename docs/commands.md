# OmegaBot Commands

## /history

Purpose: DM the recent chat history from the current channel.

Defaults:

- count default: 50
- count max: 50
- transcript format: [YYYY-MM-DD HH:mm] user: message (24-hour)
- delivery: DM only
- overflow: text file attachment

Notes:

- If DMs are closed, the bot replies with an ephemeral error message.

## /summary

Purpose: Summarize recent messages and DM the result.

Defaults:

- count default: 50
- count max: 100
- transcript input: includes author, excludes timestamps (to reduce noise)
- delivery: DM only
- overflow: text file attachment

## Transcript defaults

Shared in `src/services/transcript/defaults.ts`:

- locale: en-GB
- timezone: UTC
- 24-hour time (hour12: false)