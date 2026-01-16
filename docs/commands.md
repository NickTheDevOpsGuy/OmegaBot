# Command Reference

This page documents all slash commands supported by OmegaBot, including subcommands and options where relevant.

---

## General

- `/ping`
  - Verify the bot is online and measure latency

---

## GitHub

Commands for interacting with GitHub repositories configured for the server.

- `/gh issue`
  - Fetch a GitHub issue by number
- `/gh issues`
  - List open GitHub issues
- `/gh prs`
  - List open pull requests
- `/gh status`
  - Show GitHub integration status
  - Includes configuration, polling, and channel bindings
- `/pr`
  - Fetch a single pull request by number
  - Legacy shortcut for /gh pr

---

## Fun

All fun commands are grouped under /fun.

`/fun chucknorris`

Chuck Norris facts.

Options:

- category (optional) — Fetch a fact from a specific category
- query (optional) — Search facts by keyword
- ephemeral (optional) — Show result only to you

Modes:

- Random fact (no options)
- Category- based fact
- Search- based fact

⸻

`/fun dadjoke`

Dad jokes.

Options:
- query (optional) — Search jokes by keyword
- ephemeral (optional) — Show result only to you

Modes:
- Random joke
- Search results

---

`/fun coinflip`

Flip a coin with a short animation.

Options:

- ephemeral (optional) — Show result only to you

Output:

- Heads or tails

---

`/fun dice`

Roll dice with optional animation.

Options:

- sides (optional, default: 6) — Number of sides per die (2–100)
- count (optional, default: 1) — Number of dice to roll (1–10)
- ephemeral (optional) — Show result only to you

Behavior:

- d6 rolls display dice face emojis
- Multiple dice rolls show individual results and a total

---

`/fun poll`

Create a quick poll.

Options:

- question — Poll question
- option1 — First option
- option2 — Second option
- option3 (optional)
- option4 (optional)

Behavior:

- 2–4 options
- One vote per user
- Poll automatically closes after a timeout

---

`/fun weather`

Show today’s weather for a location.

Options:

- location — City, ZIP, or region
- unit (optional) — Temperature unit (F or C)
- ephemeral (optional) — Show result only to you

---

`/fun weather7`

Show a 7- day weather forecast.

Options:
- location — City, ZIP, or region
- unit (optional) — Temperature unit (F or C)
- ephemeral (optional) — Show result only to you

---

`/fun leaderboard`

View fun command usage statistics.

Options:

- view (optional)
  - users — Top users (default)
  - commands — Top fun commands
  - user — Single- user breakdown
- user (optional) — Target user (used with view:user)
- limit (optional) — Number of results to show (default: 10, max: 25)

Views:

- Top users with per- command highlights
- Top commands by usage count
- Single- user view with avatar and command breakdown

---

Summary & History

Commands for summarizing and reviewing recent messages.

- /summary
  - Summarize recent messages
  - Uses local or LLM- based summarization
- `/history`
  - DM recent channel history
  - Falls back to file upload if content is too long
- `/playback`
  - Page through recent messages using buttons
  - `/pagination`
- Demo the reusable pagination helper

---

Timezone

Commands for managing user timezones.
- `/timezone set`
  - Save your IANA timezone (example: America/New_York)
- `/timezone show`
  - Display your currently saved timezone
- `/timezone clear`
  - Remove your saved timezone