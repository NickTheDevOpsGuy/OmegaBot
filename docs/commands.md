# Command Reference

Complete documentation for all OmegaBot slash commands, including subcommands and options.

---

## General

### `/ping`

Verify the bot is online and measure latency.

**Use case:** Quick health check to see if the bot is responsive.

---

## Admin Commands

**Permissions:** Requires Administrator permission in Discord.

Server administration and monitoring commands for bot owners and admins.

### `/admin stats`

Show comprehensive bot statistics.

**Displays:**

- **Uptime:** Days, hours, minutes since last restart
- **Memory:** Current memory usage (heap used/total)
- **Total Commands:** All fun command executions
- **Database Stats:** Joke count, coin flip count
- **Unique Users:** Number of users who've used fun commands
- **Node Version:** Current Node.js runtime version

**Use case:** Monitor bot health and usage at a glance.

---

### `/admin health`

Run health checks on bot services and configuration.

**Checks:**

- **Database:** SQLite connection and query execution
- **Environment Variables:** Required Discord/GitHub tokens
- **API Keys:** Optional service availability (Anthropic, Weather)

**Statuses:**

- ✅ Healthy/Configured
- ⚠️ Missing/Not configured
- ❌ Error (with details)

**Use case:** Troubleshoot bot issues and verify configuration.

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

### `/fun joke`

Community-submitted jokes organized by generation.

#### `/fun joke random [category]`

Get a random joke from the database.

**Options:**

- `category` (optional) — Filter by category: boomer, genx, millennial, genz, genalpha, random, tech, dark, wholesome, anti, puns, observational, dad

**Use case:** Brighten your day with community humor.

---

#### `/fun joke add <text> <category>`

Add a new joke to the database.

**Options:**

- `text` (required) — The joke text (max 1000 characters)
- `category` (required) — Category: boomer, genx, millennial, genz, genalpha, random, tech, dark, wholesome, anti, puns, observational, dad

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

- `category` (optional) — Filter by category

**Displays:** Last 10 jokes with ID, category, and usage count.

**Use case:** See what jokes are available.

---

### `/fun coinflip`

Flip a coin with animation.

**Options:**

- `ephemeral` (optional) — Show result only to you

**Output:** Heads or tails (result is tracked for stats)

**Use case:** Make quick decisions or settle debates.

---

### `/fun coinstats [user] [leaderboard]`

View coin flip statistics.

**Options:**

- `user` (optional) — Check another user's stats
- `leaderboard` (optional) — Show top flippers (true/false)

**Displays:**

- Personal stats: Heads vs. tails count and percentages
- Leaderboard: Top 10 users by total flips
- User avatar and formatted results

**Use case:** Track your luck and see who flips the most.

---

### `/fun dice [sides] [count]`

Roll dice with optional animation.

**Options:**

- `sides` (optional, default: 6) — Number of sides per die (2–100)
- `count` (optional, default: 1) — Number of dice to roll (1–10)
- `ephemeral` (optional) — Show result only to you

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

### `/fun weather <location> [unit]`

Show current weather for a location.

**Options:**

- `location` (required) — City, ZIP code, or region
- `unit` (optional) — Temperature unit (F or C)
- `ephemeral` (optional) — Show result only to you

**Displays:**

- Current temperature and feels-like
- Weather conditions
- Sunrise/sunset times

**Use case:** Check weather without leaving Discord.

---

### `/fun weather7 <location> [unit]`

Show 7-day weather forecast.

**Options:**

- `location` (required) — City, ZIP code, or region
- `unit` (optional) — Temperature unit (F or C)
- `ephemeral` (optional) — Show result only to you

**Displays:** Week-long forecast with high/low temperatures.

**Use case:** Plan ahead for the week.

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

### `/timezone save <timezone>`

Save your IANA timezone.

**Options:**

- `timezone` (required) — IANA timezone identifier (e.g., `America/New_York`)

**Use case:** Let others know your local time for better coordination.

---

### `/timezone show [user]`

Display saved timezone.

**Options:**

- `user` (optional) — Check another user's timezone

**Displays:** Timezone and current local time.

**Use case:** Check someone's local time before messaging.

---

### `/timezone clear`

Remove your saved timezone from the database.

**Use case:** Stop sharing your timezone information.

---

### `/timezone compare <user>`

Compare your timezone with another user's.

**Options:**

- `user` (required) — User to compare with

**Displays:** Time difference between timezones.

**Use case:** Calculate time differences for scheduling.

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

## Notes

- **Ephemeral Options:** Many commands support `ephemeral: true` to show results only to you
- **Usage Tracking:** Fun commands automatically track usage for leaderboards
- **Permissions:** Some commands require specific roles (check server configuration)
- **API Keys:** Weather and AI features require API keys in `.env`
- **GitHub Integration:** GitHub commands require repository configuration
- **Admin Commands:** Only users with Administrator permission can use `/admin` commands

For configuration details, see `.env.example` in the repository.
