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
- Lets members choose approved server roles with the `/roles` slash command.
- Can search curated FAQ docs plus an optional Notion wiki via `/wiki` and `/notion search`.
- Includes admin-focused health, metrics, backup, and troubleshooting support for self-hosted operation.
- Stores persistent data in SQLite so state survives restarts.
- **Optional Web API** — same backend can power a website (profiles, leaderboards, events, games). See [Web platform](docs/web-platform.md) and **Setting up the website** below.

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

**Optional — run the Web API** (for a separate website using the same data):

```bash
npm run build
npm run api
# API listens on port 4000 (or set WEB_API_PORT). See docs/web-platform.md.
```

---

## Feature Highlights

### Community and games

- Games: 8-ball, RPS, Tic Tac Toe, Trivia, Blackjack, Connect 4 (persistent multi-day, continue option), Hangman, Wordle, Slots (1/3/5 rows, rare random events), Darts, Chess, Memory, Higher/Lower, Dice, Coinflip, Choose, Would You Rather
- Daily check-ins, shared XP/levels, and rotating daily quests
- Achievements and per-game stats
- Quotes, jokes, polls, reminders, and leaderboards

### AI and utility

- DM or mention-based chat plus `/fun utility chat`
- Supportive chat modes, recaps, saved context, and gentle check-ins
- GitHub and service status lookups
- Curated docs lookup with `/wiki` and optional Notion-backed knowledge search
- Weather, timezone-aware profile info, server info, and invite helpers

### Server operations

- FAQ, rules, welcome handling, starboard, self-assignable roles, and suggestions
- **`/event`** — Create, join, list, and manage platform events (create, update, join, list, results)
- `/admin health`, metrics, dashboard, DB backup, and DB integrity checks
- Graceful shutdown, rate limiting, and resilient interaction recovery

## Runtime Notes

- Designed to run as a long-lived process
- Safe to restart (state persisted in SQLite)
- Background pollers never crash the process
- Optional features auto-disable when misconfigured
- **Backup**: Run `npm run db:backup` periodically, or copy `data/omegabot.db`; see [Runbook](docs/runbook.md)
- **Runtime**: Node.js 18+ is supported; Node 22 is recommended (LTS), and `.nvmrc` is set to `22`
- **Web API**: Optional. Run `npm run api` to start the HTTP API (default port 4000). Same database as the bot. See [Web platform](docs/web-platform.md) for **setting up a website**.

---

## Documentation Map

Every Markdown file in [`docs/`](docs/) is linked here (23 docs).

### Start here

- [Command Reference](docs/commands.md) – Command behavior and user-facing command details
- [Discord Bot Setup](docs/setup-discord.md) – Create the bot app, intents, scopes, and permissions
- [Environment Setup](docs/setup-env.md) – `.env` configuration and optional features
- [Notion Wiki Setup](docs/setup-notion.md) – Connect a Notion database for `/wiki` and `/notion`
- [Runbook](docs/runbook.md) – Deploy, restart, backup, health checks, Docker
- [Troubleshooting](docs/troubleshooting.md) – Common failures, interaction issues, native module mismatch notes

### User-facing systems

- [Analytics](docs/analytics.md) – Daily game metrics and usage tracking
- [Conversational Chat & LLM](docs/chat-and-llm.md) – Chat modes, memory, recap, supportive chat behavior
- [FAQ for Server Admins](docs/faq-admins.md) – Hosting/admin questions and common operational answers
- [FAQ System Design](docs/faq.md) – FAQ storage model and entry format
- [Localization (i18n)](docs/i18n.md) – Locale support and translation patterns
- [Progression](docs/progression.md) – Shared XP, level curve, quest rewards, and where progression appears
- [Transcripts & Summaries](docs/transcripts.md) – Transcript pipeline and summary modes

### Development and architecture

- [Development Notes](docs/dev-notes.md) – Conventions, file sizing, and architectural guidance
- [File & folder tree](docs/file-structure.md) – Expandable directory tree
- [Games development](docs/games-development.md) – Adding games, progression, result rendering, sessions
- [Grafana Dashboard](docs/grafana.md) – Metrics visualization setup
- [Project Structure](docs/project-structure.md) – Folder layout and where major systems live
- [Web platform](docs/web-platform.md) – Shared backend for Discord + web, API, **website setup steps**, events, posts, profiles

### Product and roadmap docs

- [Gameplay Improvements](docs/gameplay-improvements.md) – Play-feel and balance ideas
- [Games & UX Ideas](docs/games-and-ux-ideas.md) – Engagement and usability ideas
- [Improvement Ideas](docs/improvements.md) – Maintainability, ops, and quality ideas
- [Recommendations](docs/recommendations.md) – Command and feature recommendations

### Index (all docs in `docs/`)

[analytics](docs/analytics.md) · [chat-and-llm](docs/chat-and-llm.md) · [commands](docs/commands.md) · [dev-notes](docs/dev-notes.md) · [faq](docs/faq.md) · [faq-admins](docs/faq-admins.md) · [file-structure](docs/file-structure.md) · [games-and-ux-ideas](docs/games-and-ux-ideas.md) · [games-development](docs/games-development.md) · [gameplay-improvements](docs/gameplay-improvements.md) · [grafana](docs/grafana.md) · [i18n](docs/i18n.md) · [improvements](docs/improvements.md) · [progression](docs/progression.md) · [project-structure](docs/project-structure.md) · [recommendations](docs/recommendations.md) · [runbook](docs/runbook.md) · [setup-discord](docs/setup-discord.md) · [setup-env](docs/setup-env.md) · [setup-notion](docs/setup-notion.md) · [transcripts](docs/transcripts.md) · [troubleshooting](docs/troubleshooting.md) · [web-platform](docs/web-platform.md)

---

## Tech Stack

- **Runtime**: Node.js 18+ (22 LTS recommended; use `nvm use` or `fnm use` if you use a version manager)
- **Language**: TypeScript 5.x
- **Discord**: discord.js v14
- **Database**: SQLite (better-sqlite3)
- **Logging**: pino
- **Quality**: ESLint, Prettier, Husky
- **Ops**: Docker, Docker Compose, Dependabot, DevContainer

---

## Code layout

Commands live under `src/commands/` (core, games, social, other); services under `src/services/` (core, discord, integrations, stores). Games use `gameLogic.ts`, `ui.ts`, and `*Store.ts`; the fun command is built from `funSubcommands/` and routes via `execute.ts`. For a full walkthrough and an expandable file tree, see [Project structure](docs/project-structure.md) and [File & folder tree](docs/file-structure.md).

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint && npm run typecheck`
5. Run `npm test` to verify tests pass
6. Submit a pull request

For where things live in the repo, see [Project structure](docs/project-structure.md), [File & folder tree](docs/file-structure.md), and [Development Notes](docs/dev-notes.md).

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
npm run api           # Start the optional Web API (see docs/web-platform.md)
```

35+ test files (200+ tests): unit tests (games, stores, services, config, roles, rate limiting, metrics) and integration tests (dice, slots, ping, admin, help, status, config, FAQ, rules, suggestion).

---

## License

This project is licensed under the MIT License.
See the [LICENSE](./LICENSE) file for details.
