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
- GitHub integration with polling-based automation, including:
  - Health/status checks
  - Issue and PR lookups
  - New PR announcements
  - Issue and PR assignee change announcements
  - Issue and PR closed announcements
- Configuration and feature gating via environment variables (optional features run only when enabled)
- Per-guild configuration backed by persistent storage and admin slash commands
- **Timezone support** – Save your timezone, view it later, and compare times across locations or users
- **Reminders** – SQLite-backed `/fun remind` with delivery that survives bot restarts

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
- Persistent on-disk storage (versioned JSON)
- Usage tracking for FAQs
- Permission guardrails for destructive actions

### Fun / utility commands

All fun commands are available under `/fun`:

- `/fun 8ball` – Ask the magic 8-ball a question
- `/fun rps` – Rock paper scissors with win tracking
- `/fun coinflip` – Heads or tails
- `/fun coinflipstats` – View coin flip statistics with emoji bars
- `/fun dice` – Custom dice rolls
- `/fun poll` – Create polls with 2-4 options
- `/fun remind` – Set reminders (1 min to 7 days)
- `/fun weather` – Current weather for a location
- `/fun leaderboard` – Track fun command usage and top users
- `/fun joke` – Community jokes (random, add, list, remove)

## Planned features

- `/docs` command for documentation lookups
- Expanded GitHub automation (labels, reviews, merge events)
- Enhanced fun leaderboard views and stats
- Improved summary output (highlights, action items, structured sections)

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
│   │   │       ├── remind.ts
│   │   │       ├── rps.ts
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
