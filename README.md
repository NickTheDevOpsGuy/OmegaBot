<p align="center">
  <img src="assets/banner.png" alt="OmegaBot Banner" width="900">
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/NickTheDevOpsGuy/OmegaBot">
  <img src="https://img.shields.io/github/license/NickTheDevOpsGuy/OmegaBot">
  <img src="https://codecov.io/gh/NickTheDevOpsGuy/OmegaBot/graph/badge.svg" alt="codecov">
  <img src="https://img.shields.io/badge/node-18+-blue">
  <img src="https://img.shields.io/badge/discord.js-v14-blue">
  <img src="https://img.shields.io/badge/made%20with-TypeScript-blue">
</p>

# OmegaBot

A self-hosted Discord bot for community servers, built with TypeScript, Discord.js v14, and SQLite.
OmegaBot combines games, progression, moderation, utility commands, and AI-assisted chat in one modular codebase.

## What It Does

- Runs a broad `/fun` command hub with games, reminders, polls, quotes, weather, chat, and leaderboards.
- Tracks progression with achievements, shared XP/levels, and daily quests.
- Supports server utility features like FAQ, rules, welcome flows, starboard, suggestions, and status checks.
- Includes admin-focused health, metrics, backup, and troubleshooting support for self-hosted operation.
- Stores persistent data in SQLite so state survives restarts.

## Good Fit For

- Community Discord servers that want games, utility, and moderation in one bot.
- Self-hosters who want a feature-rich bot they can run themselves.
- Developers looking for a larger Discord.js reference project with tests, docs, and operational tooling.

## Not Trying To Be

- A hosted SaaS bot.
- A minimal starter template.
- A clinical mental health product. Supportive chat exists, but it is not therapy.

---

## Quick Start

```bash
git clone https://github.com/NickTheDevOpsGuy/OmegaBot.git
cd OmegaBot
npm install
cp .env.example .env  # Edit with your bot token
npm run build
npm run register
npm start
```

**Docker (alternative):**

```bash
cp .env.example .env   # Add your DISCORD_TOKEN, DISCORD_APP_ID, DISCORD_GUILD_ID
docker compose up -d
```

---

## Feature Highlights

### Community and games

- Games: 8-ball, RPS, Tic Tac Toe, Trivia, Blackjack, Connect 4, Hangman, Wordle, Slots, Darts, Chess, Memory, Higher/Lower, Dice, Coinflip, Choose, Would You Rather
- Daily check-ins, shared XP/levels, and rotating daily quests
- Achievements and per-game stats
- Quotes, jokes, polls, reminders, and leaderboards

### AI and utility

- DM or mention-based chat plus `/fun utility chat`
- Supportive chat modes, recaps, saved context, and gentle check-ins
- GitHub and service status lookups
- Weather, timezone-aware profile info, server info, and invite helpers

### Server operations

- FAQ, rules, welcome handling, starboard, and suggestions
- `/admin health`, metrics, dashboard, DB backup, and DB integrity checks
- Graceful shutdown, rate limiting, and resilient interaction recovery

## Runtime Notes

- Designed to run as a long-lived process
- Safe to restart (state persisted in SQLite)
- Background pollers never crash the process
- Optional features auto-disable when misconfigured
- **Backup**: Run `npm run db:backup` periodically, or copy `data/omegabot.db`; see [Runbook](docs/runbook.md)
- **Runtime**: Node.js 18+ is supported; Node 20 is recommended, and `.nvmrc` is set to `20`

---

## Documentation Map

Every Markdown file in [`docs/`](docs/) is linked here.

### Start here

- [Command Reference](docs/commands.md) – Command behavior and user-facing command details
- [Discord Bot Setup](docs/setup-discord.md) – Create the bot app, intents, scopes, and permissions
- [Environment Setup](docs/setup-env.md) – `.env` configuration and optional features
- [Runbook](docs/runbook.md) – Deploy, restart, backup, health checks, Docker
- [Troubleshooting](docs/troubleshooting.md) – Common failures, interaction issues, native module mismatch notes

### User-facing systems

- [Conversational Chat & LLM](docs/chat-and-llm.md) – Chat modes, memory, recap, supportive chat behavior
- [Progression](docs/progression.md) – Shared XP, level curve, quest rewards, and where progression appears
- [Analytics](docs/analytics.md) – Daily game metrics and usage tracking
- [Localization (i18n)](docs/i18n.md) – Locale support and translation patterns
- [Transcripts & Summaries](docs/transcripts.md) – Transcript pipeline and summary modes
- [FAQ for Server Admins](docs/faq-admins.md) – Hosting/admin questions and common operational answers
- [FAQ System Design](docs/faq.md) – FAQ storage model and entry format

### Development and architecture

- [Development Notes](docs/dev-notes.md) – Conventions, file sizing, and architectural guidance
- [Project Structure](docs/project-structure.md) – Folder layout and where major systems live
- [Grafana Dashboard](docs/grafana.md) – Metrics visualization setup

### Product and roadmap docs

- [Gameplay Improvements](docs/gameplay-improvements.md) – Play-feel and balance ideas
- [Games & UX Ideas](docs/games-and-ux-ideas.md) – Engagement and usability ideas
- [Improvement Ideas](docs/improvements.md) – Maintainability, ops, and quality ideas
- [Recommendations](docs/recommendations.md) – Command and feature recommendations

---

## Tech Stack

- **Runtime**: Node.js 18+ (20 recommended; use `nvm use` or `fnm use` if you use a version manager)
- **Language**: TypeScript 5.x
- **Discord**: discord.js v14
- **Database**: SQLite (better-sqlite3)
- **Logging**: pino
- **Quality**: ESLint, Prettier, Husky
- **Ops**: Docker, Docker Compose, Dependabot, DevContainer

---

## Code Layout

- **Games**: `gameLogic.ts` (pure rules), `ui.ts` (Discord components), `*Store.ts` (database). Shared stats in `services/gameStats/`. Timeouts in `src/constants.ts`. Long flows split into subfolders: `tictactoe/vsBot.ts`, `vsPlayer.ts`; `darts/stats.ts`, `solo.ts`, `challenge.ts`; `slots/gameLogic.ts`, `slotsStore.ts`; `hangman/play.ts`, `statsDisplay.ts`, `words.ts`; `connect4/pvp.ts`. **Daily** in `daily/dailyStore.ts`. **Stats** in `stats/fetchers.ts`, `stats/buildEmbed.ts`. **Achievements** in `achievements/definitions.ts`, `embedBuilder.ts`. **Starboard** in `services/starboard/starboardStore.ts`, `starboardEmbed.ts`.
- **Database**: SQLite via `services/database/db.ts`; `getRow<T>()` and `getAll<T>()` for typed query results. Giveaway store, joke store, reminders, stats fetchers, and quote use these helpers.
- **Help**: Topic text in `src/commands/help/topics/*.ts` (overview, changelog, summary in `topics/meta/`).
- **Interactions**: Main router in `src/services/discord/interaction/interactionHandler.ts`; handlers in `handlers/` (autocomplete, modals, buttons, context menus).
- **Fun command**: `fun.ts` (definition), `execute.ts` (routing + handler registry), `autocomplete.ts` (remind/quote IDs). Subcommands in `subcommands/`; groups in `funSubcommands/` (gamesGroup, utilityGroup, etc.). **Reminders**: single source in `services/reminders/store.ts`; fun command uses it (no duplicate DB logic).
- **Info command**: `info.ts` (definition); handlers in `info/handlers/` (userInfo, serverInfo, avatar).
- **Analytics**: Game metrics in `services/fun/gameUsageMetrics.ts`; non-game in `services/analytics/commandUsageStore.ts`.
- **Logging context**: Request IDs in `services/logging/requestContext.ts`.
- **i18n**: `src/i18n/index.ts`; see [i18n docs](docs/i18n.md).

For the full folder walkthrough, see [Project Structure](docs/project-structure.md).

<details>
<summary>📁 Click to expand file structure</summary>

The tree below is a simplified overview. The repo uses **command groups** (`core/`, `games/`, `social/`, `other/`) and **service groups** (`core/`, `discord/`, `integrations/`, `stores/`). For the current layout, see [Project structure](docs/project-structure.md).

```plaintext

.
├── .devcontainer
│   └── devcontainer.json
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
│   ├── dependabot.yml
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
├── coverage
│   ├── lcov-report
│   │   ├── src
│   │   │   ├── commands
│   │   │   │   ├── admin
│   │   │   │   │   ├── subcommands
│   │   │   │   │   │   ├── health.ts.html
│   │   │   │   │   │   └── index.html
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── utils.ts.html
│   │   │   │   ├── fun
│   │   │   │   │   ├── subcommands
│   │   │   │   │   │   ├── daily
│   │   │   │   │   │   │   ├── dailyStore.ts.html
│   │   │   │   │   │   │   └── index.html
│   │   │   │   │   │   ├── hangman
│   │   │   │   │   │   │   ├── hangmanStats.ts.html
│   │   │   │   │   │   │   └── index.html
│   │   │   │   │   │   ├── slots
│   │   │   │   │   │   │   ├── gameLogic.ts.html
│   │   │   │   │   │   │   ├── index.html
│   │   │   │   │   │   │   └── slotsStore.ts.html
│   │   │   │   │   │   ├── wordle
│   │   │   │   │   │   │   ├── gameLogic.ts.html
│   │   │   │   │   │   │   └── index.html
│   │   │   │   │   │   ├── daily.ts.html
│   │   │   │   │   │   ├── dice.ts.html
│   │   │   │   │   │   ├── index.html
│   │   │   │   │   │   ├── slots.ts.html
│   │   │   │   │   │   └── tictactoeStore.ts.html
│   │   │   │   │   ├── coinflipStore.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── giveaway
│   │   │   │   │   ├── giveawayStore.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── help
│   │   │   │   │   ├── topics
│   │   │   │   │   │   ├── admin.ts.html
│   │   │   │   │   │   ├── changelog.ts.html
│   │   │   │   │   │   ├── commands.ts.html
│   │   │   │   │   │   ├── fun.ts.html
│   │   │   │   │   │   ├── games.ts.html
│   │   │   │   │   │   ├── github.ts.html
│   │   │   │   │   │   ├── index.html
│   │   │   │   │   │   ├── overview.ts.html
│   │   │   │   │   │   ├── profile.ts.html
│   │   │   │   │   │   ├── quotes.ts.html
│   │   │   │   │   │   ├── status.ts.html
│   │   │   │   │   │   └── summary.ts.html
│   │   │   │   │   ├── helpText.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── ping
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── ping.ts.html
│   │   │   │   └── profile
│   │   │   │       ├── index.html
│   │   │   │       └── timezones.ts.html
│   │   │   ├── config
│   │   │   │   ├── env.ts.html
│   │   │   │   └── index.html
│   │   │   ├── i18n
│   │   │   │   ├── index.html
│   │   │   │   └── index.ts.html
│   │   │   ├── services
│   │   │   │   ├── dashboard
│   │   │   │   │   ├── dashboard.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── database
│   │   │   │   │   ├── db.ts.html
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── migrations.ts.html
│   │   │   │   ├── discord
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── interactionErrors.ts.html
│   │   │   │   │   └── rateLimit.ts.html
│   │   │   │   ├── faq
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── services.ts.html
│   │   │   │   │   ├── store.ts.html
│   │   │   │   │   └── types.ts.html
│   │   │   │   ├── fun
│   │   │   │   │   ├── funUsageStore.ts.html
│   │   │   │   │   ├── gameUsageMetrics.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── gameStats
│   │   │   │   │   ├── gameStats.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── metrics
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── server.ts.html
│   │   │   │   └── quotes
│   │   │   │       ├── index.html
│   │   │   │       └── quoteStore.ts.html
│   │   │   ├── test
│   │   │   │   ├── dbTestUtils.ts.html
│   │   │   │   └── index.html
│   │   │   ├── utils
│   │   │   │   ├── colors.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── logger.ts.html
│   │   │   ├── constants.ts.html
│   │   │   └── index.html
│   │   ├── base.css
│   │   ├── block-navigation.js
│   │   ├── favicon.png
│   │   ├── index.html
│   │   ├── prettify.css
│   │   ├── prettify.js
│   │   ├── sort-arrow-sprite.png
│   │   └── sorter.js
│   ├── src
│   │   ├── commands
│   │   │   ├── admin
│   │   │   │   ├── subcommands
│   │   │   │   │   ├── health.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── index.html
│   │   │   │   └── utils.ts.html
│   │   │   ├── fun
│   │   │   │   ├── subcommands
│   │   │   │   │   ├── daily
│   │   │   │   │   │   ├── dailyStore.ts.html
│   │   │   │   │   │   └── index.html
│   │   │   │   │   ├── hangman
│   │   │   │   │   │   ├── hangmanStats.ts.html
│   │   │   │   │   │   └── index.html
│   │   │   │   │   ├── slots
│   │   │   │   │   │   ├── gameLogic.ts.html
│   │   │   │   │   │   ├── index.html
│   │   │   │   │   │   └── slotsStore.ts.html
│   │   │   │   │   ├── wordle
│   │   │   │   │   │   ├── gameLogic.ts.html
│   │   │   │   │   │   └── index.html
│   │   │   │   │   ├── daily.ts.html
│   │   │   │   │   ├── dice.ts.html
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── slots.ts.html
│   │   │   │   │   └── tictactoeStore.ts.html
│   │   │   │   ├── coinflipStore.ts.html
│   │   │   │   └── index.html
│   │   │   ├── giveaway
│   │   │   │   ├── giveawayStore.ts.html
│   │   │   │   └── index.html
│   │   │   ├── help
│   │   │   │   ├── topics
│   │   │   │   │   ├── admin.ts.html
│   │   │   │   │   ├── changelog.ts.html
│   │   │   │   │   ├── commands.ts.html
│   │   │   │   │   ├── fun.ts.html
│   │   │   │   │   ├── games.ts.html
│   │   │   │   │   ├── github.ts.html
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── overview.ts.html
│   │   │   │   │   ├── profile.ts.html
│   │   │   │   │   ├── quotes.ts.html
│   │   │   │   │   ├── status.ts.html
│   │   │   │   │   └── summary.ts.html
│   │   │   │   ├── helpText.ts.html
│   │   │   │   └── index.html
│   │   │   ├── ping
│   │   │   │   ├── index.html
│   │   │   │   └── ping.ts.html
│   │   │   └── profile
│   │   │       ├── index.html
│   │   │       └── timezones.ts.html
│   │   ├── config
│   │   │   ├── env.ts.html
│   │   │   └── index.html
│   │   ├── i18n
│   │   │   ├── index.html
│   │   │   └── index.ts.html
│   │   ├── services
│   │   │   ├── dashboard
│   │   │   │   ├── dashboard.ts.html
│   │   │   │   └── index.html
│   │   │   ├── database
│   │   │   │   ├── db.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── migrations.ts.html
│   │   │   ├── discord
│   │   │   │   ├── index.html
│   │   │   │   ├── interactionErrors.ts.html
│   │   │   │   └── rateLimit.ts.html
│   │   │   ├── faq
│   │   │   │   ├── index.html
│   │   │   │   ├── services.ts.html
│   │   │   │   ├── store.ts.html
│   │   │   │   └── types.ts.html
│   │   │   ├── fun
│   │   │   │   ├── funUsageStore.ts.html
│   │   │   │   ├── gameUsageMetrics.ts.html
│   │   │   │   └── index.html
│   │   │   ├── gameStats
│   │   │   │   ├── gameStats.ts.html
│   │   │   │   └── index.html
│   │   │   ├── metrics
│   │   │   │   ├── index.html
│   │   │   │   └── server.ts.html
│   │   │   └── quotes
│   │   │       ├── index.html
│   │   │       └── quoteStore.ts.html
│   │   ├── test
│   │   │   ├── dbTestUtils.ts.html
│   │   │   └── index.html
│   │   ├── utils
│   │   │   ├── colors.ts.html
│   │   │   ├── index.html
│   │   │   └── logger.ts.html
│   │   ├── constants.ts.html
│   │   └── index.html
│   ├── base.css
│   ├── block-navigation.js
│   ├── favicon.png
│   ├── index.html
│   ├── lcov.info
│   ├── prettify.css
│   ├── prettify.js
│   ├── sort-arrow-sprite.png
│   └── sorter.js
├── data
│   ├── fun-usage.json
│   ├── omegabot.db
│   └── test-seed.db
├── docs
│   ├── analytics.md
│   ├── chat-and-llm.md
│   ├── commands.md
│   ├── dev-notes.md
│   ├── faq-admins.md
│   ├── faq.md
│   ├── gameplay-improvements.md
│   ├── games-and-ux-ideas.md
│   ├── grafana.md
│   ├── i18n.md
│   ├── improvements.md
│   ├── progression.md
│   ├── project-structure.md
│   ├── recommendations.md
│   ├── runbook.md
│   ├── setup-discord.md
│   ├── setup-env.md
│   ├── transcripts.md
│   └── troubleshooting.md
├── grafana
│   └── omegabot-dashboard.json
├── migrations
│   ├── 001_rps_stats.sql
│   ├── 002_game_usage_daily.sql
│   ├── 003_darts_stats.sql
│   ├── 004_command_usage_daily.sql
│   ├── 005_hangman_seed_words.sql
│   ├── 006_moderator_roles.sql
│   ├── 007_chat_messages.sql
│   └── schema.sql
├── scripts
│   ├── backup-db.sh
│   ├── check-discord-version.mjs
│   ├── db-check.ts
│   ├── e2e-discord.mjs
│   ├── precheck.sh
│   └── seed-dev-db.mjs
├── src
│   ├── commands
│   │   ├── core
│   │   │   ├── admin
│   │   │   │   ├── subcommands
│   │   │   │   │   ├── ban.ts
│   │   │   │   │   ├── health.integration.test.ts
│   │   │   │   │   ├── health.ts
│   │   │   │   │   ├── kick.ts
│   │   │   │   │   ├── stats.ts
│   │   │   │   │   └── timeout.ts
│   │   │   │   ├── admin.integration.test.ts
│   │   │   │   ├── admin.ts
│   │   │   │   └── utils.ts
│   │   │   ├── config
│   │   │   │   ├── config.integration.test.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── moderatorRole.ts
│   │   │   │   ├── rules.ts
│   │   │   │   ├── starboard.ts
│   │   │   │   ├── view.ts
│   │   │   │   └── welcome.ts
│   │   │   ├── faq
│   │   │   │   ├── subcommands
│   │   │   │   │   ├── add.integration.test.ts
│   │   │   │   │   ├── add.ts
│   │   │   │   │   ├── get.ts
│   │   │   │   │   ├── list.ts
│   │   │   │   │   └── remove.ts
│   │   │   │   └── faq.ts
│   │   │   ├── help
│   │   │   │   ├── topics
│   │   │   │   │   ├── meta
│   │   │   │   │   │   ├── changelog.ts
│   │   │   │   │   │   ├── commands.ts
│   │   │   │   │   │   ├── overview.ts
│   │   │   │   │   │   └── summary.ts
│   │   │   │   │   ├── admin.ts
│   │   │   │   │   ├── fun.ts
│   │   │   │   │   ├── games.ts
│   │   │   │   │   ├── github.ts
│   │   │   │   │   ├── info.ts
│   │   │   │   │   ├── profile.ts
│   │   │   │   │   ├── quotes.ts
│   │   │   │   │   └── status.ts
│   │   │   │   ├── help.integration.test.ts
│   │   │   │   ├── help.ts
│   │   │   │   ├── helpText.test.ts
│   │   │   │   └── helpText.ts
│   │   │   ├── info
│   │   │   │   ├── handlers
│   │   │   │   │   ├── avatar.ts
│   │   │   │   │   ├── serverInfo.ts
│   │   │   │   │   └── userInfo.ts
│   │   │   │   └── info.ts
│   │   │   ├── profile
│   │   │   │   ├── subcommands
│   │   │   │   │   ├── afk.ts
│   │   │   │   │   ├── timezone.ts
│   │   │   │   │   └── view.ts
│   │   │   │   ├── profile.ts
│   │   │   │   ├── profileHelpers.ts
│   │   │   │   ├── timezones.test.ts
│   │   │   │   └── timezones.ts
│   │   │   ├── rules
│   │   │   │   ├── rules.integration.test.ts
│   │   │   │   └── rules.ts
│   │   │   ├── status
│   │   │   │   ├── status.integration.test.ts
│   │   │   │   └── status.ts
│   │   │   └── suggestion
│   │   │       ├── suggestion.integration.test.ts
│   │   │       └── suggestion.ts
│   │   ├── games
│   │   │   ├── achievements
│   │   │   │   ├── achievements.social.test.ts
│   │   │   │   ├── achievements.test.ts
│   │   │   │   ├── achievements.testHelpers.ts
│   │   │   │   ├── achievements.ts
│   │   │   │   ├── definitions.ts
│   │   │   │   └── embedBuilder.ts
│   │   │   ├── fun
│   │   │   │   ├── fun
│   │   │   │   ├── funSubcommands
│   │   │   │   │   ├── gamesGroup.ts
│   │   │   │   │   ├── hangmanGroup.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── quoteGroup.ts
│   │   │   │   │   ├── remindGroup.ts
│   │   │   │   │   └── utilityGroup.ts
│   │   │   │   ├── subcommands
│   │   │   │   │   ├── games-a
│   │   │   │   │   │   ├── blackjack
│   │   │   │   │   │   │   ├── blackjack.ts
│   │   │   │   │   │   │   ├── blackjackStore.ts
│   │   │   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── ui.ts
│   │   │   │   │   │   ├── chess
│   │   │   │   │   │   │   ├── chess.ts
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   ├── connect4
│   │   │   │   │   │   │   ├── connect4.ts
│   │   │   │   │   │   │   ├── connect4Store.ts
│   │   │   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── pvp.ts
│   │   │   │   │   │   │   └── ui.ts
│   │   │   │   │   │   ├── daily
│   │   │   │   │   │   │   ├── daily.test.ts
│   │   │   │   │   │   │   ├── daily.ts
│   │   │   │   │   │   │   ├── dailyStore.ts
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   ├── darts
│   │   │   │   │   │   │   ├── challenge.ts
│   │   │   │   │   │   │   ├── darts.ts
│   │   │   │   │   │   │   ├── dartsStore.ts
│   │   │   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── solo.ts
│   │   │   │   │   │   │   ├── stats.ts
│   │   │   │   │   │   │   └── ui.ts
│   │   │   │   │   │   ├── dice
│   │   │   │   │   │   │   ├── dice.integration.test.ts
│   │   │   │   │   │   │   ├── dice.ts
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   └── hangman
│   │   │   │   │   │       ├── tests
│   │   │   │   │   │       │   ├── hangman.test.ts
│   │   │   │   │   │       │   └── hangmanStats.test.ts
│   │   │   │   │   │       ├── hangman.ts
│   │   │   │   │   │       ├── hangmanStats.ts
│   │   │   │   │   │       ├── hangmanWordStore.ts
│   │   │   │   │   │       ├── index.ts
│   │   │   │   │   │       ├── play.ts
│   │   │   │   │   │       ├── statsDisplay.ts
│   │   │   │   │   │       ├── ui.ts
│   │   │   │   │   │       └── words.ts
│   │   │   │   │   ├── games-b
│   │   │   │   │   │   ├── higherlower
│   │   │   │   │   │   │   ├── higherlower.ts
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   ├── memory
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── memory.ts
│   │   │   │   │   │   ├── rps
│   │   │   │   │   │   │   ├── challenge.ts
│   │   │   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── rps.test.ts
│   │   │   │   │   │   │   ├── rps.ts
│   │   │   │   │   │   │   ├── rpsStore.ts
│   │   │   │   │   │   │   ├── stats.ts
│   │   │   │   │   │   │   └── ui.ts
│   │   │   │   │   │   ├── slots
│   │   │   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── slots.integration.test.ts
│   │   │   │   │   │   │   ├── slots.test.ts
│   │   │   │   │   │   │   ├── slots.ts
│   │   │   │   │   │   │   └── slotsStore.ts
│   │   │   │   │   │   ├── stats
│   │   │   │   │   │   │   ├── buildEmbed.ts
│   │   │   │   │   │   │   ├── fetchers.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── stats.ts
│   │   │   │   │   │   ├── tictactoe
│   │   │   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── tictactoe.ts
│   │   │   │   │   │   │   ├── tictactoeStore.test.ts
│   │   │   │   │   │   │   ├── tictactoeStore.ts
│   │   │   │   │   │   │   ├── ui.ts
│   │   │   │   │   │   │   ├── vsBot.ts
│   │   │   │   │   │   │   └── vsPlayer.ts
│   │   │   │   │   │   ├── trivia
│   │   │   │   │   │   │   ├── gameFlow.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── questions.ts
│   │   │   │   │   │   │   ├── trivia.test.ts
│   │   │   │   │   │   │   ├── trivia.ts
│   │   │   │   │   │   │   └── triviaStore.ts
│   │   │   │   │   │   └── wordle
│   │   │   │   │   │       ├── gameLogic.ts
│   │   │   │   │   │       ├── index.ts
│   │   │   │   │   │       ├── ui.ts
│   │   │   │   │   │       ├── wordle.test.ts
│   │   │   │   │   │       ├── wordle.ts
│   │   │   │   │   │       └── wordleStore.ts
│   │   │   │   │   ├── shared
│   │   │   │   │   │   ├── gameFeedback.test.ts
│   │   │   │   │   │   └── gameFeedback.ts
│   │   │   │   │   ├── social
│   │   │   │   │   │   ├── fact
│   │   │   │   │   │   │   ├── fact.ts
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   ├── joke
│   │   │   │   │   │   │   ├── add.ts
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   ├── list.ts
│   │   │   │   │   │   │   ├── random.ts
│   │   │   │   │   │   │   └── remove.ts
│   │   │   │   │   │   ├── leaderboard
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── leaderboard.ts
│   │   │   │   │   │   ├── poll
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── poll.ts
│   │   │   │   │   │   ├── quote
│   │   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   │   └── quote.ts
│   │   │   │   │   │   └── wouldYouRather
│   │   │   │   │   │       ├── index.ts
│   │   │   │   │   │       └── wouldYouRather.ts
│   │   │   │   │   └── utility
│   │   │   │   │       ├── chat
│   │   │   │   │       │   ├── chat.ts
│   │   │   │   │       │   └── index.ts
│   │   │   │   │       ├── choose
│   │   │   │   │       │   ├── choose.ts
│   │   │   │   │       │   └── index.ts
│   │   │   │   │       ├── coinflip
│   │   │   │   │       │   ├── coinflip.ts
│   │   │   │   │       │   └── index.ts
│   │   │   │   │       ├── coinflipstats
│   │   │   │   │       │   ├── coinflipstats.ts
│   │   │   │   │       │   └── index.ts
│   │   │   │   │       ├── compliment
│   │   │   │   │       │   ├── compliment.ts
│   │   │   │   │       │   └── index.ts
│   │   │   │   │       ├── eightball
│   │   │   │   │       │   ├── eightball.ts
│   │   │   │   │       │   └── index.ts
│   │   │   │   │       ├── quest
│   │   │   │   │       │   ├── index.ts
│   │   │   │   │       │   └── quest.ts
│   │   │   │   │       ├── reminders
│   │   │   │   │       │   ├── index.ts
│   │   │   │   │       │   └── reminders.ts
│   │   │   │   │       ├── roast
│   │   │   │   │       │   ├── index.ts
│   │   │   │   │       │   └── roast.ts
│   │   │   │   │       └── weather
│   │   │   │   │           ├── index.ts
│   │   │   │   │           └── weather.ts
│   │   │   │   ├── autocomplete.ts
│   │   │   │   ├── coinflipStore.test.ts
│   │   │   │   ├── coinflipStore.ts
│   │   │   │   ├── coinStore.ts
│   │   │   │   ├── execute.ts
│   │   │   │   └── fun.ts
│   │   │   ├── giveaway
│   │   │   │   ├── buttonHandler.ts
│   │   │   │   ├── giveaway.ts
│   │   │   │   ├── giveawayStore.test.ts
│   │   │   │   ├── giveawayStore.ts
│   │   │   │   ├── handlers.ts
│   │   │   │   ├── ui.ts
│   │   │   │   └── utils.ts
│   │   │   └── view-achievements
│   │   │       └── view-achievements.ts
│   │   ├── other
│   │   │   ├── github
│   │   │   │   ├── gh.ts
│   │   │   │   ├── github.ts
│   │   │   │   ├── pr.ts
│   │   │   │   └── status.ts
│   │   │   ├── ping
│   │   │   │   ├── ping.integration.test.ts
│   │   │   │   └── ping.ts
│   │   │   ├── playback
│   │   │   │   └── playback.ts
│   │   │   └── view-profile
│   │   │       └── view-profile.ts
│   │   └── social
│   │       ├── history
│   │       │   └── history.ts
│   │       ├── quote-message
│   │       │   └── quote-message.ts
│   │       ├── summarize-message
│   │       │   └── summarize-message.ts
│   │       └── summary
│   │           └── summary.ts
│   ├── config
│   │   └── env.ts
│   ├── i18n
│   │   └── index.ts
│   ├── services
│   │   ├── core
│   │   │   ├── analytics
│   │   │   │   └── commandUsageStore.ts
│   │   │   ├── cache
│   │   │   │   └── simpleCache.ts
│   │   │   ├── circuitBreaker
│   │   │   │   ├── breakers.ts
│   │   │   │   └── circuitBreaker.ts
│   │   │   ├── config
│   │   │   │   ├── guildConfigStore.test.ts
│   │   │   │   ├── guildConfigStore.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── types.ts
│   │   │   ├── dashboard
│   │   │   │   └── dashboard.ts
│   │   │   ├── database
│   │   │   │   ├── db.ts
│   │   │   │   ├── dbTestUtils.ts
│   │   │   │   └── migrations.ts
│   │   │   ├── logging
│   │   │   │   ├── index.ts
│   │   │   │   └── requestContext.ts
│   │   │   ├── metrics
│   │   │   │   └── server.ts
│   │   │   └── time
│   │   │       ├── formatTimestamp.ts
│   │   │       └── validateTimezone.ts
│   │   ├── discord
│   │   │   └── discord
│   │   │       ├── handlers
│   │   │       │   ├── autocomplete.ts
│   │   │       │   ├── buttons.ts
│   │   │       │   ├── contextMenus.ts
│   │   │       │   └── modals.ts
│   │   │       ├── interaction
│   │   │       │   ├── interactionErrors.ts
│   │   │       │   ├── interactionHandler.ts
│   │   │       │   └── tracedInteractionHandler.ts
│   │   │       ├── rateLimit
│   │   │       │   ├── index.ts
│   │   │       │   ├── rateLimit.test.ts
│   │   │       │   └── rateLimit.ts
│   │   │       ├── chatMessageHandler.test.ts
│   │   │       ├── chatMessageHandler.ts
│   │   │       ├── commandLoader.ts
│   │   │       ├── commandMeta.ts
│   │   │       ├── commandTypes.ts
│   │   │       ├── cooldowns.ts
│   │   │       ├── fetchChannelMessages.ts
│   │   │       └── safeReply.ts
│   │   ├── integrations
│   │   │   ├── ai
│   │   │   │   ├── chatService.test.ts
│   │   │   │   ├── chatService.ts
│   │   │   │   ├── claudeService.ts
│   │   │   │   └── conversationStore.ts
│   │   │   ├── faq
│   │   │   │   ├── _shared.ts
│   │   │   │   ├── faqService.ts
│   │   │   │   ├── permissions.ts
│   │   │   │   ├── services.test.ts
│   │   │   │   ├── services.ts
│   │   │   │   ├── store.test.ts
│   │   │   │   ├── store.ts
│   │   │   │   └── types.ts
│   │   │   ├── github
│   │   │   │   ├── shared
│   │   │   │   │   ├── githubErrorMessage.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── githubApi.ts
│   │   │   │   ├── githubCache.ts
│   │   │   │   ├── githubClient.ts
│   │   │   │   ├── issueAssigneePoller.ts
│   │   │   │   ├── issueAssigneePollerState.ts
│   │   │   │   ├── lastSeenStore.ts
│   │   │   │   ├── prFormatter.ts
│   │   │   │   └── prPoller.ts
│   │   │   ├── starboard
│   │   │   │   ├── starboardEmbed.ts
│   │   │   │   ├── starboardHandler.ts
│   │   │   │   ├── starboardStore.test.ts
│   │   │   │   └── starboardStore.ts
│   │   │   ├── statuspage
│   │   │   │   └── statuspageApi.ts
│   │   │   ├── summary
│   │   │   │   ├── llmSummary.ts
│   │   │   │   ├── localSummary.ts
│   │   │   │   └── summarizer.ts
│   │   │   ├── weather
│   │   │   │   ├── forecast.ts
│   │   │   │   └── types.ts
│   │   │   └── welcome
│   │   │       ├── welcomeHandler.ts
│   │   │       ├── welcomeMessage.test.ts
│   │   │       └── welcomeMessage.ts
│   │   └── stores
│   │       ├── fun
│   │       │   ├── funUsageStore.test.ts
│   │       │   ├── funUsageStore.ts
│   │       │   ├── gameUsageMetrics.test.ts
│   │       │   ├── gameUsageMetrics.ts
│   │       │   └── pollStore.ts
│   │       ├── gameStats
│   │       │   ├── gameStats.test.ts
│   │       │   └── gameStats.ts
│   │       ├── joke
│   │       │   └── jokeStore.ts
│   │       ├── progression
│   │       │   ├── progressionMath.ts
│   │       │   ├── progressionStore.test.ts
│   │       │   ├── progressionStore.ts
│   │       │   ├── questStore.test.ts
│   │       │   └── questStore.ts
│   │       ├── quotes
│   │       │   ├── quoteStore.test.ts
│   │       │   └── quoteStore.ts
│   │       ├── reminders
│   │       │   ├── index.ts
│   │       │   ├── scheduler.ts
│   │       │   ├── schema.ts
│   │       │   └── store.ts
│   │       ├── roles
│   │       │   └── autoRoleHandler.ts
│   │       ├── timezone
│   │       │   └── timezoneStore.ts
│   │       └── transcript
│   │           ├── buildTranscript.ts
│   │           └── defaults.ts
│   ├── test
│   ├── types
│   │   └── discord-client.d.ts
│   ├── utils
│   │   ├── colors.ts
│   │   ├── constants.ts
│   │   ├── errors.ts
│   │   ├── interactions.ts
│   │   └── logger.ts
│   ├── bot.ts
│   └── registerCommands.ts
├── .dockerignore
├── .env.example
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc.yml
├── CHANGELOG.md
├── CONTRIBUTORS.md
├── docker-compose.yml
├── Dockerfile
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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint && npm run typecheck`
5. Run `npm test` to verify tests pass
6. Submit a pull request

**Project layout:** Commands are under `src/commands/{core,games,social,other}/`. Services are under `src/services/{core,discord,integrations,stores}/`. Help topics: `src/commands/core/help/topics/` (meta/ has overview, changelog, summary, commands). Discord routing: `src/services/discord/discord/interaction/` and `.../handlers/`. See [Project structure](docs/project-structure.md) and [Development Notes](docs/dev-notes.md) for details.

---

## Testing

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run with coverage report
npm run test:e2e      # E2E: start bot, wait for Discord ready (needs DISCORD_TOKEN, DISCORD_APP_ID)
npm run check:discord # Verify discord.js is v14.x
npm run db:check      # Verify SQLite database integrity
npm run db:backup     # Backup database to data/backups/
npm run db:seed       # Seed dev DB with sample FAQs/timezone (DATABASE_PATH=data/dev.db)
npm run dev:watch     # Run with hot reload (restarts on file change)
```

35+ test files (200+ tests): unit tests (games, stores, services, config, rate limiting, metrics) and integration tests (dice, slots, ping, admin, help, status, config, FAQ, rules, suggestion).

---

## License

This project is licensed under the MIT License.
See the [LICENSE](./LICENSE) file for details.
