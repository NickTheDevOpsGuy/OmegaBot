# OmegaBot — Command Reference

This document describes all user-facing slash commands supported by OmegaBot.
Commands are grouped by category and include subcommands and expected behavior.

---

## General

### `/ping`

Check whether the bot is online and measure response latency.

---

## Fun

All fun commands are grouped under `/fun`.

### `/fun chucknorris`

Chuck Norris facts.

- Random fact by default
- Optional category
- Optional search query

### `/fun dadjoke`

Dad jokes.
- Random joke by default
- Optional search query

### `/fun coinflip`

Flip a coin.
- Animated flip
- Result is either **HEADS** or **TAILS**
- Usage is tracked per user

### `/fun dice`

Roll one or more dice.
- Options:
  - `sides` (default: 6, max: 100)
  - `count` (default: 1, max: 10)
- Animated roll
- Shows individual rolls
- Shows total when rolling more than one die

### `/fun poll`

Create a quick poll.
- 2–4 options
- One vote per user
- Poll automatically closes after timeout
- Results update live

### `/fun weather`

Today’s weather for a location.
- City, ZIP, or region
- Optional temperature unit (F or C)

### `/fun weather7`

7-day weather forecast.
- City, ZIP, or region
- Optional temperature unit (F or C)

### `/fun leaderboard`

View fun command usage statistics.

**Views**

- Default: top users
- `view:commands` → most-used fun commands
- `view:user` → your usage breakdown
- `view:user user:@Someone` → another user’s breakdown

**Output**

- Shows total usage counts
- Shows per-command usage (e.g. `dadjoke 3x, coinflip 2x`)
- Single-user view includes avatar

---

## GitHub

### `/gh issue`

Fetch a GitHub issue by number.

### `/gh issues`

List open GitHub issues.

### `/gh prs`

List open pull requests.

### `/gh status`

Show GitHub integration status.
- Configuration
- Polling state
- Channels in use

### `/pr`

Legacy shortcut to fetch a single pull request by number.

---

## Summary & History

### `/summary`

Summarize recent messages.
- Local summary by default
- LLM-based summary when enabled

### `/history`

Send recent channel history via DM.
- Falls back to file upload if content is long

### `/playback`

Page through recent messages using buttons.

### `/pagination`

Demonstration of the reusable pagination helper.

---

## Timezone

### `/timezone set`

Save your IANA timezone (example: `America/New_York`).

### `/timezone show`

Display your currently saved timezone.

### `/timezone clear`

Remove your saved timezone.

---

## Admin (Manage Server)

### `/config welcome-channel set`

Set the channel used for welcome messages.

### `/config welcome-channel clear`

Remove the configured welcome channel.

---

## Notes

- Slash commands may take up to an hour to appear if registered globally
- Admin-only commands are hidden from non-admin users
- Usage-based features require the bot to have write access to the data directory
