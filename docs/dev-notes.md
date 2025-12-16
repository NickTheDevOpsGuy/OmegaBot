# Development Notes

General development notes and gotchas for OmegaBot.

---

## Interaction Lifecycle

- Every slash command must reply or defer within 3 seconds
- Prefer `deferReply()` + `editReply()` for async work
- Use ephemeral replies for status updates
- DM output when content is private

---

## Message Fetching

Standard pipeline:

fetch → filter bots → sort → map → transcript

Notes:

- Discord returns `Collection`, convert to arrays before processing
- Missing permissions can cause silent failures

---

## Permissions

Required bot permissions:

- View Channels
- Read Message History
- Send Messages
- Attach Files
- Use Slash Commands

Important:

- Missing **Read Message History** causes fetches to return empty collections

---

## Environment Variables

Never commit `.env`.

Required:

- `DISCORD_TOKEN`
- `DISCORD_APP_ID`
- `DISCORD_GUILD_ID`

Optional:

- `SUMMARY_MODE` (`local` | `llm`)

Always include `.env.example`.

---

## Formatting & Limits

- Discord message limit: 2000 characters
- Safe working limit: ~1900 characters
- Use file attachments for overflow

---

## Debugging Checklist

- Slash command not appearing → re-register commands
- Bot replies but cannot DM → user has DMs closed
- Interaction timeout → missing defer
- Errors should be logged internally, not spammed to users
