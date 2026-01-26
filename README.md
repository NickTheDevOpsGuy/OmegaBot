<p align="center">
  <img src="assets/banner.png" alt="OmegaBot Banner" width="900">
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/NickTheDevOpsGuy/OmegaBot">
  <img src="https://img.shields.io/github/license/NickTheDevOpsGuy/OmegaBot">
  <img src="https://img.shields.io/badge/node-18+-blue">
  <img src="https://img.shields.io/badge/discord.js-v14-blue">
  <img src="https://img.shields.io/badge/made%20with-TypeScript-blue">
</p>

# OmegaBot

OmegaBot is a modular Discord bot designed to support development projects with quick summaries, FAQs, GitHub lookups, and automated notifications. The structure is clean and fully service based which makes it easy to extend.

---

## Table of Contents

- [Features](#features)
- [Documentation](#documentation)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Extending OmegaBot](#extending-omegabot)
- [Contributors](#contributors)
- [License](#license)

---

## Current features

- Modular slash-command system with auto-loading from `dist/commands`
- Centralized interaction routing with consistent, safe error handling
- Structured logging (pino) with timing and Discord error code awareness
- Welcome and onboarding flows triggered on member join (`guildMemberAdd`)
- Optional auto-role assignment for new members (`DISCORD_AUTO_ROLE_ID`)
- GitHub integration with polling-based automation, including:
  - Health/status checks
  - Issue and PR lookups
  - New PR announcements
  - Issue and PR assignee change announcements
  - Issue and PR closed announcements
- Configuration and feature gating via environment variables  
  (optional features run only when enabled)
- Per-guild configuration backed by persistent storage and admin slash commands
- **Timezone support** – Save your timezone, view it later, compare users, and convert times across zones
- **Reminders** – SQLite-backed `/fun remind` with delivery that survives bot restarts
- **AFK system** – Set AFK status with auto-reply when mentioned
- **Starboard system** – Automatically highlights starred messages once a reaction threshold is met
- **Suggestion system** – Server members can submit ideas and vote on them
- **Persistent storage** – SQLite via `better-sqlite3` for stats, reminders, fun usage, and configuration
- **Safe interaction handling** – Gracefully handles expired or already-acknowledged interactions

### Core commands

- /help – Command discovery and getting started guide
- /ping – Health check
- /summary – Conversation summaries (local + LLM mode)
- /history – Conversation history (DM + file fallback)
- /playback – Transcript playback with button pagination
- /pagination – Reusable inline paging helper
- /timezone – Per-user IANA timezone support (set, show, compare, convert)
- /changelog – Ephemeral release preview
- /afk – Set AFK status with auto-reply

### FAQ system

- /faq add – Create persistent FAQ entries
- /faq get – Retrieve FAQs by key
- /faq list – List FAQs with sorting and filtering
- /faq remove – Remove FAQs with confirmation flow
- Persistent on-disk storage
- Usage tracking for FAQs
- Permission guardrails for destructive actions

### Fun / utility commands

All fun commands are available under `/fun`.

#### Games

- `/fun 8ball` – Ask the magic 8-ball a question
- `/fun rps` – Rock paper scissors (solo or `opponent:@user` for PvP)
- `/fun tictactoe` – Tic Tac Toe (solo or `opponent:@user` for PvP)
- `/fun trivia` – Trivia questions with points and streaks
- `/fun coinflip` – Heads or tails
- `/fun coinflipstats` – Coin flip statistics with emoji breakdowns
- `/fun dice` – Custom dice rolls (2–100 sides, 1–10 dice)
- `/fun poll` – Create polls with 2–4 options
- `/fun blackjack` – Interactive blackjack game with buttons
- `/fun connect4` – PvP Connect 4 game with interactive buttons
- `/fun would-you-rather` – Vote on random WYR questions

#### Quotes & Jokes

- `/fun quote add` – Save a memorable server quote
- `/fun quote random` – Get a random quote
- `/fun quote list` – Browse recent quotes
- `/fun quote search` – Search quotes by text
- `/fun joke` – Community jokes (random, add, list, remove)

#### Daily & Stats

- `/fun daily` – Daily check-in for points and streaks
- `/fun leaderboard` – Fun command usage and top users

#### Utility

- `/fun remind` – Set reminders (1 minute to 7 days)
- `/fun weather` – Current weather for a location
- `/fun weather7` – 7-day forecast
- `/fun fact` – Random interesting facts

## Planned features

- `/docs` command for documentation lookups
- Expanded GitHub automation (labels, reviews, merge events)
- Achievement system (games played, streaks, milestones)
- Daily and weekly challenges
- Improved summary output
- (highlights, action items, structured sections)

---

## Documentation

- 🤖 [Discord Bot Setup Guide](docs/setup-discord.md)
- ⚙️ [Environment Setup](docs/setup-env.md)
- 📘 [Command Reference](docs/commands.md)
- ❓ [FAQ Storage Design](docs/faq.md)
- 🧠 [Transcript & Summary Design](docs/transcripts.md)
- 🛠️ [Development Notes](docs/dev-notes.md)

---

## Getting Started

### Requirements

- Node 18 or newer
- A Discord bot token
- A development server where you have Manage Server permissions

### Setup

> Need help creating a Discord bot and token?  
> See the [Discord Bot Setup Guide](docs/setup-discord.md).

1. Clone the repository:

```bash
git clone https://github.com/NickTheDevOpsGuy/OmegaBot.git
cd OmegaBot
```

2. Install dependencies:

```bash
npm install
```

3. Create a .env file based on the example configuration:

- [.env.example](.env.example)

4. Register slash commands with your development guild:

```bash
npm run register
```

**Command registration mode**

OmegaBot supports two registration modes:

- Guild registration (recommended for development)
  If DISCORD_GUILD_ID is set, commands are registered to that guild and appear immediately.

- Global registration
  If DISCORD_GUILD_ID is not set, commands are registered globally and may take up to 1 hour to appear.

5. Build and run the bot:

```bash
npm run build
npm start
```

For development with auto-reload:

```bash
npm run dev
```

You should see:

```
OmegaBot is online
```

---

## Testing

OmegaBot uses **Vitest** for fast unit tests.

```bash
npm run test       # watch mode
npm run test:run   # CI mode
```

Most database-backed unit tests run with an in-memory SQLite database (`DATABASE_PATH=:memory:`) via `src/test/dbTestUtils.ts`.

## CI

Pull requests run:

- `npm run test:run` (Vitest)
- `npm run lint` (ESLint)
- `npm run typecheck` (TypeScript)
- `npm run format:check` (Prettier)

## Technical Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Discord Library**: discord.js v14
- **Database**: SQLite via better-sqlite3
- **Logging**: pino
- **Code Quality**: ESLint, Prettier
- **Git Hooks**: Husky

### Discord.js v14 Features

OmegaBot uses discord.js v14 which includes:

- Improved TypeScript support
- Better slash command handling
- Enhanced permission system
- Modern Discord API features

---

## Project Structure

<details>
<summary>🗂 Click to expand file structure</summary>

```

.
├── assets
│   ├── banner.png
│   └── omegabot.png
├── CHANGELOG.md
├── CONTRIBUTORS.md
├── data
│   └── omegabot.db
├── docs
│   ├── commands.md
│   ├── dev-notes.md
│   ├── faq.md
│   ├── setup-discord.md
│   ├── setup-env.md
│   └── transcripts.md
├── .env.example
├── eslint.config.ts
├── .github
│   ├── ISSUE_TEMPLATE
│   │   ├── bug.yml
│   │   ├── config.yml
│   │   ├── documentation.yml
│   │   ├── enhancement_refactor.yml
│   │   ├── feature_request.yml
│   │   └── question_discussion.yml
│   ├── pull_request_template.md
│   └── workflows
│       └── OmegaBot.yml
├── .gitignore
├── .husky
│   ├── pre-commit
│   └── pre-push
├── LICENSE
├── migrations
│   └── 001_rps_stats.sql
├── package.json
├── .prettierignore
├── .prettierrc.yml
├── README.md
├── scripts
│   └── precheck.sh
├── src
│   ├── bot.ts
│   ├── commands
│   │   ├── admin
│   │   │   └── admin.ts
│   │   ├── afk
│   │   │   └── afk.ts
│   │   ├── changelog
│   │   │   └── changelog.ts
│   │   ├── config
│   │   │   └── config.ts
│   │   ├── faq
│   │   │   ├── faq.ts
│   │   │   └── subcommands
│   │   │       ├── add.ts
│   │   │       ├── get.ts
│   │   │       ├── list.ts
│   │   │       └── remove.ts
│   │   ├── fun
│   │   │   ├── coinflipStore.test.ts
│   │   │   ├── coinflipStore.ts
│   │   │   ├── coinStore.ts
│   │   │   ├── fun.ts
│   │   │   └── subcommands
│   │   │       ├── coinflipstats.ts
│   │   │       ├── coinflip.ts
│   │   │       ├── daily.ts
│   │   │       ├── dice.ts
│   │   │       ├── eightball.ts
│   │   │       ├── joke
│   │   │       │   ├── add.ts
│   │   │       │   ├── index.ts
│   │   │       │   ├── list.ts
│   │   │       │   ├── random.ts
│   │   │       │   └── remove.ts
│   │   │       ├── leaderboard.ts
│   │   │       ├── poll.ts
│   │   │       ├── quote.ts
│   │   │       ├── remind.ts
│   │   │       ├── rps.ts
│   │   │       ├── tictactoe.ts
│   │   │       ├── trivia.ts
│   │   │       └── weather.ts
│   │   ├── general
│   │   │   └── ping.ts
│   │   ├── github
│   │   │   ├── gh.ts
│   │   │   ├── pr.ts
│   │   │   └── status.ts
│   │   ├── help
│   │   │   ├── helpText.ts
│   │   │   └── help.ts
│   │   ├── history
│   │   │   └── history.ts
│   │   ├── pagination
│   │   │   └── pagination.ts
│   │   ├── playback
│   │   │   └── playback.ts
│   │   ├── summary
│   │   │   └── summary.ts
│   │   └── timezone
│   │       └── timezone.ts
│   ├── config
│   │   └── env.ts
│   ├── registerCommands.ts
│   ├── services
│   │   ├── ai
│   │   │   └── claudeService.ts
│   │   ├── cache
│   │   │   └── simpleCache.ts
│   │   ├── config
│   │   │   ├── guildConfigStore.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── database
│   │   │   └── db.ts
│   │   ├── discord
│   │   │   ├── commandLoader.ts
│   │   │   ├── commandMeta.ts
│   │   │   ├── commandTypes.ts
│   │   │   ├── cooldowns.ts
│   │   │   ├── fetchChannelMessages.ts
│   │   │   ├── interactionHandler.ts
│   │   │   ├── safeReply.ts
│   │   │   └── tracedInteractionHandler.ts
│   │   ├── faq
│   │   │   ├── faqService.ts
│   │   │   ├── permissions.ts
│   │   │   ├── services.test.ts
│   │   │   ├── services.ts
│   │   │   ├── _shared.ts
│   │   │   ├── store.test.ts
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   ├── fun
│   │   │   ├── funUsageStore.test.ts
│   │   │   ├── funUsageStore.ts
│   │   │   └── pollStore.ts
│   │   ├── github
│   │   │   ├── githubApi.ts
│   │   │   ├── githubCache.ts
│   │   │   ├── githubClient.ts
│   │   │   ├── githubErrorMessage.ts
│   │   │   ├── issueAssigneePollerState.ts
│   │   │   ├── issueAssigneePoller.ts
│   │   │   ├── lastSeenStore.ts
│   │   │   ├── prFormatter.ts
│   │   │   ├── prPoller.ts
│   │   │   └── types.ts
│   │   ├── joke
│   │   │   └── jokeStore.ts
│   │   ├── logging
│   │   │   ├── index.ts
│   │   │   └── requestContext.ts
│   │   ├── reminders
│   │   │   ├── index.ts
│   │   │   ├── scheduler.ts
│   │   │   ├── schema.ts
│   │   │   └── store.ts
│   │   ├── roles
│   │   │   └── autoRoleHandler.ts
│   │   ├── summary
│   │   │   ├── llmSummary.ts
│   │   │   ├── localSummary.ts
│   │   │   └── summarizer.ts
│   │   ├── time
│   │   │   ├── formatTimestamp.ts
│   │   │   └── validateTimezone.ts
│   │   ├── timezone
│   │   │   └── timezoneStore.ts
│   │   ├── transcript
│   │   │   ├── buildTranscript.ts
│   │   │   └── defaults.ts
│   │   ├── weather
│   │   │   ├── forecast.ts
│   │   │   └── types.ts
│   │   └── welcome
│   │       ├── welcomeHandler.ts
│   │       └── welcomeMessage.ts
│   ├── test
│   │   └── dbTestUtils.ts
│   ├── types
│   │   └── discord-client.d.ts
│   └── utils
│       ├── colors.ts
│       ├── interactions.ts
│       └── logger.ts
├── tsconfig.json
└── vitest.config.ts

```

</details>

---

## Extending OmegaBot

OmegaBot is designed for small, focused modules. To add new features:

1. Create a new command file under `src/commands/<category>/`
2. Add any logic needed inside `src/services/<feature>/`
3. Run `npm run register` to publish new slash commands

---

## Contributors

Thanks to everyone who has helped build or improve OmegaBot.

<a href="https://contrib.rocks/image?repo=NickTheDevOpsGuy/OmegaBot">
  <img src="https://contrib.rocks/image?repo=NickTheDevOpsGuy/OmegaBot" alt="Contributors">
</a>

Generated using https://contrib.rocks

To learn how to contribute, read the [CONTRIBUTOR.md](CONTRIBUTOR.md) file.

If you would like to contribute, please open an issue or submit a pull request.

---

## License

MIT License. Use and modify freely.
