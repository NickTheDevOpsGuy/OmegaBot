# 🛠️ Development Notes

This document captures practical knowledge learned while building OmegaBot.
It exists to save future-you time.

---

## Interaction Lifecycle (Important)

Every slash command must do **one** of the following within 3 seconds:

- `reply()`
- `deferReply()`

Failing to do this causes:
- Interaction timeout
- Silent failures
- “This interaction failed” messages

### Best Practice

- Defer early
- Use ephemeral replies for status
- Deliver results via DM when appropriate

---

## Ephemeral vs DM

### Ephemeral
Use when:
- Acknowledging success/failure
- Showing short status messages
- Avoiding channel noise

### DM
Use when:
- Output is long
- Content is private
- Transcript or summary is generated

Always handle **DM failures** gracefully.

---

## Message Fetching Pipeline

Standard pattern:

```
fetch
→ filter bots
→ sort oldest → newest
→ map to minimal shape
→ buildTranscript
```

Important notes:
- Discord returns a `Collection`, not an array
- Sorting must be explicit
- Missing permissions can fail silently

---

## Required Permissions

Your bot must have:

- View Channels
- Read Message History
- Send Messages
- Attach Files
- Use Slash Commands

Without **Read Message History**, fetch can return empty results.

---

## Gateway Intents

Ensure these are enabled:
- `Guilds`
- `GuildMessages`
- `MessageContent` (if needed)

Mismatch between code and portal settings causes confusing bugs.

---

## Environment Variables

Never commit `.env`.

Required:

```
DISCORD_TOKEN
DISCORD_APP_ID
DISCORD_GUILD_ID
SUMMARY_MODE
```

Always provide `.env.example`.

---

## Command Registration

During development:
- Prefer **guild commands**
- Faster propagation (seconds)

Production:
- Global commands
- Can take up to 1 hour to update

---

## Logging Strategy (Recommended)

At minimum:
- Log errors server-side
- Never expose stack traces to users
- Prefix logs by feature

Examples:

- `[history] DM send failed`
- `[summary] LLM request error`

---

## Common Pitfalls

- Forgetting to defer replies
- Assuming collections are arrays
- Ignoring Discord message limits
- Not handling closed DMs
- Hardcoding timestamps without timezone support

---

## Dev Philosophy

Small helpers  
Clear boundaries  
No magic  

If logic feels duplicated, it probably belongs in `services/`.
