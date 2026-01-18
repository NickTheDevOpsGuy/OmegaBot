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
- Structured logging (pino)
- Welcome and onboarding flows triggered on member join (`guildMemberAdd`)
- Optional auto-role assignment for new members (`DISCORD_AUTO_ROLE_ID`)
- GitHub integration with 5-minute API caching (80-90% reduction in API calls), including:
  - Health/status checks
  - Issue and PR lookups
  - New PR announcements
  - Issue assignee change announcements (Issues only, PRs filtered for reduced noise)
  - Issue closed announcements
  - Smart notification filtering (only Issues trigger activity updates)
- Configuration and feature gating via environment variables (optional features run only when enabled)
- Per-guild configuration backed by persistent storage and admin slash commands
- **Timezone support** – Save your timezone, view it later, and compare times across locations or users
- **SQLite-backed storage** – Persistent data for FAQs, jokes, fun stats, timezones, and GitHub state

### Core commands

- /help – command discovery and getting started guide
- /ping – health check
- /summary – conversation summaries (local + LLM mode)
- /history – conversation history (DM + file fallback)
- /playback – transcript playback with button pagination
- /pagination – reusable inline paging helper
- /timezone – per-user IANA timezone support
- /changelog – ephemeral release preview

### FAQ system

- /faq add – create persistent FAQ entries
- /faq get – retrieve FAQs by key
- /faq list – list FAQs with sorting and filtering
- /faq remove – remove FAQs with confirmation flow
- SQLite-backed persistent storage
- Usage tracking for FAQs
- Permission guardrails for destructive actions

### Fun / utility commands

All fun commands are available under `/fun`:

- `/fun chucknorris` – Chuck Norris facts (random, category, or search)
- `/fun dadjoke` – Random or searched dad jokes
- `/fun joke` – Community-submitted jokes organized by generation
  - Categories: boomer, genx, millennial, genz, genalpha, random
  - Add jokes, browse by category, track usage
  - Moderator tools for content management
- `/fun coinflip` – Heads or tails (results tracked for stats)
- `/fun coinstats` – Coin flip statistics and leaderboards
  - Track your heads vs. tails record
  - View personal stats with avatar display
  - See top flippers leaderboard
- `/fun dice` – Custom dice rolls
- `/fun weather` – Daily weather
- `/fun weather7` – 7-day forecast
- `/fun leaderboard` – Track fun command usage and top users

## Planned features

- `/docs` command for documentation lookups
- Expanded GitHub automation (labels, reviews, merge events)
- Enhanced AI-powered summaries with Claude API
- Admin dashboard for bot statistics and monitoring

---

## Documentation

- 🤖 [Discord Bot Setup Guide](docs/setup-discord.md)
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

## Technical Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Discord Library**: discord.js v14
- **Database**: SQLite (better-sqlite3)
- **Logging**: pino
- **Code Quality**: ESLint, Prettier
- **Git Hooks**: Husky

### Discord.js v14 Features

OmegaBot uses discord.js v14 which includes:

- Improved TypeScript support
- Better slash command handling
- Enhanced permission system
- Modern Discord API features

### Performance Optimizations

- **GitHub API Caching**: In-memory cache with 5-minute TTL
  - 80-90% reduction in API calls
  - Sub-millisecond response times on cache hits
  - Automatic expiration and cleanup
  - Rate limit protection
- **SQLite Storage**: Fast, reliable persistent data storage
  - Zero-configuration database
  - ACID transactions
  - Efficient indexing for quick lookups

---

## Project Structure

<details>
<summary>🗂 Click to expand file structure</summary>

```
.
├── .github
│   ├── ISSUE_TEMPLATE
│   │   ├── bug.yml
│   │   ├── config.yml
│   │   ├── documentation.yml
│   │   ├── enhancement_refactor.yml
│   │   ├── feature_request.yml
│   │   └── question_discussion.yml
│   ├── workflows
│   │   └── OmegaBot.yml
│   └── pull_request_template.md
├── .husky
│   ├── _
│   │   ├── .gitignore
│   │   ├── applypatch-msg
│   │   ├── commit-msg
│   │   ├── h
│   │   ├── husky.sh
│   │   ├── post-applypatch
│   │   ├── post-checkout
│   │   ├── post-commit
│   │   ├── post-merge
│   │   ├── post-rewrite
│   │   ├── pre-applypatch
│   │   ├── pre-auto-gc
│   │   ├── pre-commit
│   │   ├── pre-merge-commit
│   │   ├── pre-push
│   │   ├── pre-rebase
│   │   └── prepare-commit-msg
│   ├── pre-commit
│   └── pre-push
├── assets
│   ├── banner.png
│   └── omegabot.png
├── data
│   ├── faqs.json
│   ├── fun-usage.json
│   ├── github-assignees.json
│   ├── guild-config.json
│   ├── last-seen.json
│   └── omegabot.db
├── docs
│   ├── commands.md
│   ├── dev-notes.md
│   ├── faq.md
│   ├── setup-discord.md
│   ├── setup-env.md
│   └── transcripts.md
├── scripts
│   └── precheck.sh
├── src
│   ├── commands
│   │   ├── changelog
│   │   │   └── changelog.ts
│   │   ├── config
│   │   │   └── config.ts
│   │   ├── faq
│   │   │   ├── subcommands
│   │   │   │   ├── add.ts
│   │   │   │   ├── get.ts
│   │   │   │   ├── list.ts
│   │   │   │   └── remove.ts
│   │   │   └── faq.ts
│   │   ├── fun
│   │   │   ├── subcommands
│   │   │   │   ├── joke
│   │   │   │   │   ├── add.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── list.ts
│   │   │   │   │   ├── random.ts
│   │   │   │   │   └── remove.ts
│   │   │   │   ├── coinflip.ts
│   │   │   │   ├── dice.ts
│   │   │   │   ├── leaderboard.ts
│   │   │   │   ├── poll.ts
│   │   │   │   └── weather.ts
│   │   │   └── fun.ts
│   │   ├── general
│   │   │   └── ping.ts
│   │   ├── github
│   │   │   ├── gh.ts
│   │   │   ├── pr.ts
│   │   │   └── status.ts
│   │   ├── help
│   │   │   ├── help.ts
│   │   │   └── helpText.ts
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
│   ├── services
│   │   ├── cache
│   │   │   └── simpleCache.ts
│   │   ├── config
│   │   │   ├── guildConfigStore.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── database
│   │   │   ├── db-joke-schema.sql
│   │   │   └── db.ts
│   │   ├── discord
│   │   │   ├── commandLoader.ts
│   │   │   ├── commandMeta.ts
│   │   │   ├── cooldowns.ts
│   │   │   ├── fetchChannelMessages.ts
│   │   │   ├── interactionHandler.ts
│   │   │   └── safeReply.ts
│   │   ├── faq
│   │   │   ├── _shared.ts
│   │   │   ├── faqService.ts
│   │   │   ├── permissions.ts
│   │   │   ├── services.test.ts
│   │   │   ├── services.ts
│   │   │   ├── store.test.ts
│   │   │   ├── store.test.ts.disabled
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   ├── fun
│   │   │   ├── coinStore.ts
│   │   │   ├── funUsageStore.ts
│   │   │   └── pollStore.ts
│   │   ├── github
│   │   │   ├── githubApi.ts
│   │   │   ├── githubApi.ts.backup
│   │   │   ├── githubCache.ts
│   │   │   ├── githubClient.ts
│   │   │   ├── githubErrorMessage.ts
│   │   │   ├── issueAssigneePoller.ts
│   │   │   ├── issueAssigneePoller.ts.backup
│   │   │   ├── lastSeenStore.ts
│   │   │   ├── prFormatter.ts
│   │   │   ├── prPoller.ts
│   │   │   └── types.ts
│   │   ├── joke
│   │   │   └── jokeStore.ts
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
│   ├── utils
│   │   ├── colors.ts
│   │   ├── interactions.ts
│   │   └── logger.ts
│   ├── bot.ts
│   └── registerCommands.ts
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc.yml
├── CHANGELOG.md
├── CONTRIBUTORS.md
├── eslint.config.ts
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
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
