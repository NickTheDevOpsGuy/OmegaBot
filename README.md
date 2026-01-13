<p align="center">
  <img src="assets/banner.png" alt="OmegaBot Banner" width="900">
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/NickTheDevOpsGuy/OmegaBot">
  <img src="https://img.shields.io/github/license/NickTheDevOpsGuy/OmegaBot">
  <img src="https://img.shields.io/badge/node-18+-blue">
  <img src="https://img.shields.io/badge/made%20with-JavaScript-yellow">
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

- Modular slash-command system (auto-loaded from `dist/commands`)
- Centralized interaction routing with safe error handling
- Structured logging (pino)
- Welcome and onboarding flows triggered on member join (`guildMemberAdd`)
- Optional auto-role assignment for new members (`DISCORD_AUTO_ROLE_ID`)
- GitHub integration with polling-based automation
  - Health/status checks
  - Issue and PR lookups
  - New PR announcements
  - Issue and PR assignee change announcements
  - Issue and PR closed announcements
- Configuration and feature gating via environment variables (optional features run only when configured)
- Per-guild configuration backed by persistent storage and admin slash commands

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

- `/fun chucknorris` — Chuck Norris facts (random, category, or search)
- `/fun dadjoke` — Random or searched dad jokes
- `/fun coinflip` — Heads or tails
- `/fun dice` — Custom dice rolls
- `/fun weather` — Daily weather
- `/fun weather7` — 7-day forecast
- `/fun leaderboard` — Track fun command usage and top users

## Planned features

- `/docs` command for documentation lookups
- Expanded GitHub automation (labels, reviews, merge events)
- Enhanced fun leaderboard views and stats
- Improved summary output (highlights, action items, structured sections)

---

## Documentation

- 🤖 [Discord Bot Setup Guide](docs/discord-bot-setup.md)
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
> See the [Discord Bot Setup Guide](docs/discord-bot-setup.md).

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

Command registration mode

OmegaBot supports two registration modes:

- Guild registration (recommended for development)
  If DISCORD_GUILD_ID is set, commands are registered to that guild and appear immediately.

- Global registration
  If DISCORD_GUILD_ID is not set, commands are registered globally and may take up to 1 hour to appear.

5. Run the bot locally:

```bash
npm run dev
```

You should see:

```
OmegaBot is online
```

---

## Project Structure

<details>
<summary>📁 Click to expand file structure</summary>

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
│   └── timezones.json
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
│   │   │   │   ├── chucknorris.ts
│   │   │   │   ├── coinflip.ts
│   │   │   │   ├── dadjoke.ts
│   │   │   │   ├── dice.ts
│   │   │   │   ├── java.ts
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
│   │   └── summary
│   │       └── summary.ts
│   ├── config
│   │   └── env.ts
│   ├── services
│   │   ├── config
│   │   │   ├── guildConfigStore.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
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
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   ├── fun
│   │   │   └── funUsageStore.ts
│   │   ├── github
│   │   │   ├── githubApi.ts
│   │   │   ├── githubClient.ts
│   │   │   ├── githubErrorMessage.ts
│   │   │   ├── issueAssigneePoller.ts
│   │   │   ├── lastSeenStore.ts
│   │   │   ├── prFormatter.ts
│   │   │   ├── prPoller.ts
│   │   │   └── types.ts
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
│   │   │   ├── timezone.ts
│   │   │   └── timezoneStore.ts
│   │   ├── transcript
│   │   │   ├── buildTranscript.ts
│   │   │   └── defaults.ts
│   │   ├── weather
│   │   │   ├── forecast.ts
│   │   │   ├── geocode.ts
│   │   │   └── types.ts
│   │   └── welcome
│   │       ├── welcomeHandler.ts
│   │       └── welcomeMessage.ts
│   ├── utils
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
