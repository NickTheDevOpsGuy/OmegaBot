# Command Reference

Complete documentation for all OmegaBot slash commands, including subcommands and options.

---

## General

### `/ping`

Verify the bot is online and measure latency.

**Use case:** Quick health check to see if the bot is responsive.

---

## GitHub Integration

Commands for interacting with GitHub repositories. Requires GitHub integration to be configured.

### `/gh issue <number>`

Fetch a GitHub issue by number.

**Options:**

- `number` (required) — Issue number to look up

**Use case:** Get issue details instantly without opening a browser.

---

### `/gh issues`

List open GitHub issues.

**Options:**

- `state` (optional) — Filter by state (open, closed, all)
- `limit` (optional) — Number of issues to show (default: 10, max: 50)

**Use case:** See what's currently open at a glance.

---

### `/gh prs`

List open pull requests.

**Options:**

- `state` (optional) — Filter by state (open, closed, all)
- `limit` (optional) — Number of PRs to show (default: 10, max: 50)

**Use case:** Check PR status without leaving Discord.

---

### `/gh status`

Show GitHub integration status and configuration.

**Displays:**

- Repository configuration
- Polling status
- Announcement channel bindings
- API connection health

**Use case:** Verify bot configuration and troubleshoot issues.

---

### `/pr <number>`

Fetch a single pull request by number.

**Options:**

- `number` (required) — PR number to look up

**Note:** Legacy shortcut for `/gh pr`. Consider using `/gh` commands instead.

---

## Fun Commands

Entertainment and engagement commands. All fun commands track usage for leaderboards.

### `/fun 8ball <question>`

Ask the magic 8-ball a question.

**Options:**

- `question` (required) — Your yes/no question (max 200 characters)
- `private` (optional) — Only show result to you

**Behavior:** Returns one of 20 classic magic 8-ball responses (positive, neutral, or negative).

**Use case:** Get mystical guidance on life's important questions.

---

### `/fun rps <choice> [stats]`

Play rock paper scissors against the bot.

**Options:**

- `choice` (required) — Rock, Paper, or Scissors
- `stats` (optional) — Show your win/loss record instead of playing
- `private` (optional) — Only show result to you

**Behavior:**

- Tracks wins, losses, and ties per user
- Calculates win rate percentage

**Use case:** Quick game, settle disputes, or compete for the best record.

---

### `/fun coinflip`

Flip a coin with animation.

**Options:**

- `private` (optional) — Show result only to you

**Behavior:**

- Animated flip, then reveals **HEADS** or **TAILS**
- Result is persisted to SQLite (`coin_flips`) and used by `/fun coinflipstats`

**Use case:** Make quick decisions or settle debates.

---

### `/fun coinflipstats`

View coin flip statistics.

**Options:**

- `leaderboard` (optional) — Show leaderboard instead of personal stats
- `user` (optional) — Target user (default: you)
- `limit` (optional) — How many rows to show (default: 10, max: 25)
- `private` (optional) — Show result only to you

**Displays:**

- Total flips, heads/tails counts and percentages
- Visual emoji bar showing heads vs tails distribution
- Recent flips as `H T H ...`
- Leaderboard: top users by total flips (when leaderboard=true)

**Use case:** Track your luck, see who flips the most, and compare with friends.

---

### `/fun dice [sides] [count]`

Roll dice with optional animation.

**Options:**

- `sides` (optional, default: 6) — Number of sides per die (2–100)
- `count` (optional, default: 1) — Number of dice to roll (1–10)
- `private` (optional) — Show result only to you

**Behavior:**

- d6 rolls display dice face emojis
- Multiple dice show individual results and total

**Use case:** Tabletop gaming, random number generation.

---

### `/fun poll <question> <option1> <option2> [option3] [option4]`

Create a quick poll.

**Options:**

- `question` (required) — Poll question
- `option1` (required) — First option
- `option2` (required) — Second option
- `option3` (optional) — Third option
- `option4` (optional) — Fourth option

**Behavior:**

- 2–4 options supported
- One vote per user
- Poll automatically closes after timeout

**Use case:** Quick community decisions or feedback.

---

### `/fun remind <minutes> <message>`

Create a reminder that triggers after a number of minutes.

**Options:**

- `minutes` (required) — Minutes from now (1–10080, i.e., up to 7 days)
- `message` (required) — Reminder text (max 1000 characters)
- `private` (optional) — Show confirmation only to you

**Behavior:**

- Reminder is persisted to SQLite immediately
- Reminders are delivered even after bot restart
- If the original channel is missing or not text-based, the reminder is skipped

**Use case:** Set quick reminders without leaving Discord.

---

### `/fun weather <location> [unit]`

Show current weather for a location.

**Options:**

- `location` (required) — City, ZIP code, or region
- `unit` (optional) — Temperature unit (F or C)
- `private` (optional) — Show result only to you

**Displays:**

- Current temperature and feels-like
- Weather conditions
- Sunrise/sunset times

**Use case:** Check weather without leaving Discord.

---

### `/fun leaderboard [view] [user] [limit]`

View fun command usage statistics.

**Options:**

- `view` (optional) — Display mode:
  - `users` — Top users (default)
  - `commands` — Top fun commands
  - `user` — Single-user breakdown
- `user` (optional) — Target user (for single-user view)
- `limit` (optional) — Number of results (default: 10, max: 25)

**Views:**

- **Top users:** Shows most active users with avatar and per-command highlights
- **Top commands:** Commands ranked by usage count
- **Single-user:** Detailed breakdown of one user's activity

**Use case:** See who's most engaged with fun commands.

---

### `/fun joke`

Community-submitted jokes organized by generation.

#### `/fun joke random [category]`

Get a random joke from the database.

**Options:**

- `category` (optional) — Filter by generation: boomer, genx, millennial, genz, genalpha, random

**Use case:** Brighten your day with community humor.

---

#### `/fun joke add <text> <category>`

Add a new joke to the database.

**Options:**

- `text` (required) — The joke text (max 1000 characters)
- `category` (required) — Generation category: boomer, genx, millennial, genz, genalpha, random

**Use case:** Share your favorite jokes with the server.

---

#### `/fun joke remove <id>`

Remove a joke from the database (moderators only).

**Options:**

- `id` (required) — Joke ID to remove

**Permissions:** Requires Joke Moderator role (configured in `.env`)

**Use case:** Remove inappropriate or low-quality jokes.

---

#### `/fun joke list [category]`

Browse recent jokes.

**Options:**

- `category` (optional) — Filter by generation

**Displays:** Last 10 jokes with ID, category, and usage count.

**Use case:** See what jokes are available.

---

## Summary & History

Commands for reviewing and summarizing recent messages.

### `/summary [count]`

Summarize recent messages in the channel.

**Options:**

- `count` (optional) — Number of messages to summarize (default: 50, max: 100)

**Modes:**

- `local` — Fast heuristic summaries (always available)
- `llm` — High-quality AI summaries (requires OpenAI API key)

**Configuration:** Set `SUMMARY_MODE` in `.env`

**Use case:** Catch up on conversations you missed.

---

### `/history [count]`

Get recent channel history via DM.

**Options:**

- `count` (optional) — Number of messages to retrieve (default: 50, max: 100)

**Behavior:**

- Sends messages via DM
- Falls back to file upload if content is too long

**Use case:** Review detailed message history privately.

---

### `/playback [count]`

Page through recent messages using interactive buttons.

**Options:**

- `count` (optional) — Number of messages to page through

**Controls:** Next/Previous buttons for navigation

**Use case:** Review messages interactively.

---

### `/pagination`

Demo the reusable pagination helper.

**Purpose:** Testing/demonstration command for the pagination system.

---

## Timezone Management

Commands for managing user timezones. Useful for coordinating across time zones.

### `/timezone set <timezone>`

Save your IANA timezone.

**Options:**

- `timezone` (required) — IANA timezone identifier (e.g., `America/New_York`)
- `guild` (optional) — Save for this guild only
- `private` (optional) — Show confirmation only to you (default: true)

**Use case:** Let others know your local time for better coordination.

---

### `/timezone show [user]`

Display saved timezone.

**Options:**

- `user` (optional) — Check another user's timezone
- `guild` (optional) — Check guild-specific timezone
- `private` (optional) — Show only to you

**Displays:** Timezone and current local time.

**Use case:** Check someone's local time before messaging.

---

### `/timezone clear`

Remove your saved timezone from the database.

**Options:**

- `guild` (optional) — Clear guild-specific timezone only
- `private` (optional) — Show confirmation only to you (default: true)

**Use case:** Stop sharing your timezone information.

---

### `/timezone compare <user>`

Compare your timezone with another user's.

**Options:**

- `user` (required) — User to compare with
- `guild` (optional) — Use guild-specific timezones
- `private` (optional) — Show only to you

**Displays:** Time difference between timezones.

**Use case:** Calculate time differences for scheduling.

---

### `/timezone convert <time> <to> [from]`

Convert a time between timezones.

**Options:**

- `time` (required) — Time to convert (e.g., "7:30pm")
- `to` (required) — Target timezone
- `from` (optional) — Source timezone (defaults to your saved timezone)
- `guild` (optional) — Use guild-specific timezone
- `private` (optional) — Show only to you

**Use case:** Figure out meeting times across timezones.

---

## FAQ System

Build and maintain a server knowledge base. All FAQ entries track usage count.

### `/faq get <key>`

Retrieve a FAQ entry.

**Options:**

- `key` (required) — FAQ key/identifier

**Use case:** Quick answers to common questions.

---

### `/faq add`

Create a new FAQ entry.

**Interactive form:**

- Key (unique identifier)
- Title
- Body content
- Tags (comma-separated)

**Permissions:** May require specific role (check server settings)

**Use case:** Document frequently asked questions.

---

### `/faq list [tag]`

Browse available FAQs.

**Options:**

- `tag` (optional) — Filter by tag

**Displays:** All FAQs with keys, titles, and usage counts.

**Use case:** Discover what FAQs are available.

---

### `/faq remove <key>`

Delete a FAQ entry.

**Options:**

- `key` (required) — FAQ key to remove

**Permissions:** Moderators only

**Use case:** Remove outdated or incorrect information.

---

### `/faq search <query>`

Search FAQ entries by keyword.

**Options:**

- `query` (required) — Search term

**Searches:** Titles, bodies, and tags

**Use case:** Find relevant FAQs when you don't know the exact key.

---

## Admin Commands

Commands requiring special permissions.

### `/config welcome-channel set`

Set the welcome channel for new member greetings.

**Permissions:** Manage Server

### `/config welcome-channel clear`

Remove the welcome channel configuration.

**Permissions:** Manage Server

### `/admin timeout <user> <duration> [reason]`

Timeout a user.

**Permissions:** Requires configured moderator role

### `/admin kick <user> [reason]`

Kick a user from the server.

**Permissions:** Requires configured moderator role

### `/admin ban <user> [reason]`

Ban a user from the server.

**Permissions:** Requires configured moderator role

---

## Notes

- **Usage Tracking:** Fun commands automatically track usage for leaderboards
- **Permissions:** Some commands require specific roles (check server configuration)
- **API Keys:** Weather features require API keys in `.env`
- **GitHub Integration:** GitHub commands require repository configuration

For configuration details, see `.env.example` in the repository.
