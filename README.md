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

A **self-hosted**, modular Discord bot with games, engagement features, and server management tools.
Built with clean architecture, TypeScript, and SQLite persistence.

---

## Who This Is For

OmegaBot is designed for:

- Medium to large Discord servers
- Servers that want games, moderation, and automation in one bot
- Developers who want a clean Discord.js v14 reference codebase

Not intended to be:

- A hosted SaaS bot
- A minimal example bot

---

## Features at a Glance

- 16 slash commands with logical grouping; 4 context menus (View Profile, View Achievements, Summarize, Quote)
- Interactive games: 8-ball, RPS, Tic Tac Toe, Trivia, Blackjack, Connect 4, Hangman, Wordle, Slots, Darts, Chess (Lichess), Memory (match pairs), Higher/Lower (guess your number), plus polls, choose, dice, coinflip
- 19 unlockable achievements
- Giveaway system with automatic winners
- Starboard message highlights
- AFK and timezone management
- GitHub PR and issue lookups
- Vercel and Supabase status checks (`/status vercel`, `/status supabase`)
- SQLite persistence for all data
- **Resilient interaction handling** – Defer early before heavy work, try/catch with fallback defer, safe reply wrappers, retry on transient API errors (including Discord 429 rate limits); logs include `interactionFailedRecovery: true` when recovering (reduces "failed to complete" occurrences)
- **Autocomplete support** – Timezone, FAQ keys/tags, giveaway end/reroll IDs, remind cancel/snooze (IDs), quote remove; responds with `[]` by default when no handler
- **Admin health dashboard** – `/admin health` shows database status, env vars, interaction errors, and optional API reachability (Weather, GitHub)
- **Moderation role gating** – Optional `MODERATION_ALLOWED_ROLE_IDS` in `.env` restricts `/admin` timeout, kick, and ban to specific roles (and `ADMIN_USER_IDS`); see [Environment Setup](docs/setup-env.md#admin--moderation-optional)
- **HTTP health & metrics** – Optional `METRICS_PORT` enables `/health` (200/503 with Discord status), `/metrics` (Prometheus; includes rate-limit hit counts), and `/dashboard` (web admin UI)
- **Database integrity check** – `npm run db:check` to verify SQLite health
- **Automated backup** – `npm run db:backup` copies DB to `data/backups/` (configurable); cron-friendly
- **Graceful shutdown** – SIGINT/SIGTERM close Discord cleanly, then DB
- **Rate limiting** – slots (3s), blackjack (5s), dice (2s), darts (2s), hangman (10s) cooldowns with i18n "Try again in Xs" (en/es/de)
- **Daily game metrics** – per-command, per-user play counts; `command_usage_daily` for non-game commands
- **Long game timeouts** – Blackjack, Hangman, Wordle: 1 hour; RPS and Darts challenges: 24 hours; Connect 4 and Tic Tac Toe: 30 min per move (starter can extend)
- **Extend time** – The person who started the game can add more time via an "Extend time" button (Blackjack, Connect 4, Tic Tac Toe, Wordle, RPS challenge)
- **Timeout reminders** – Connect 4 and Tic Tac Toe warn 1 minute before move timeout
- **Hangman** – Dropdown letter pick (A–M / N–Z), difficulty levels, words in SQLite, solve-time stats; admins (role in `HANGMAN_ADMIN_ROLE_ID`) can add words
- **Changelog in Discord** – `/help topic:changelog` for recent release notes
- **Reminders** – `/fun remind set`, list, **snooze** (reschedule by ID + time), cancel, clear; IDs have autocomplete for cancel/snooze
- **Info server invite** – `/info server` optional **invite** creates a 24h invite link for the channel (when bot has Create Invite)
- **Ephemeral by default** – Profile, info, achievements, help, FAQ, and playback reply privately unless you pass `private: false`
- **Quote context menu** – Right-click any message → Quote; supports embeds and bot messages; `/help topic:quotes` for details
- **i18n** – Rate-limit and error messages use guild locale (en/es/de); see [i18n docs](docs/i18n.md)
- **Correlation IDs** – Interaction logs include `requestId` for tracing failures
- **Summary fallback** – When LLM API is down, falls back to local summary
- **E2E tests** – `npm run test:e2e` validates Discord connection (needs secrets in CI)

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

## Operational Notes

- Designed to run as a long-lived process
- Safe to restart (state persisted in SQLite)
- Background pollers never crash the process
- Optional features auto-disable when misconfigured
- **Backup**: Run `npm run db:backup` periodically, or copy `data/omegabot.db`; see [Runbook](docs/runbook.md)

---

## Documentation

- [Command Reference](docs/commands.md)
- [Conversational Chat & LLM](docs/chat-and-llm.md) – How chat works (DM / @mention / `/fun chat`), conversation memory in SQLite, clearing, and env
- [Analytics](docs/analytics.md) – Daily game metrics (`game_usage_daily`), command usage (`command_usage_daily`)
- [Discord Bot Setup](docs/setup-discord.md)
- [Environment Setup](docs/setup-env.md)
- [Development Notes](docs/dev-notes.md)
- [Troubleshooting](docs/troubleshooting.md) – Debugging "failed to complete" and common issues
- [Runbook](docs/runbook.md) – Deploy, restart, backup, health, Docker
- [Localization (i18n)](docs/i18n.md) – Multi-language skeleton and usage
- [Grafana](docs/grafana.md) – Import dashboard for Prometheus metrics
- [FAQ for server admins](docs/faq-admins.md) – Common questions when running the bot
- [Improvement ideas](docs/improvements.md) – Optional next steps (beyond new commands)
- [Games & UX ideas](docs/games-and-ux-ideas.md) – Making games more fun, addictive, and usable

---

## Tech Stack

- **Runtime**: Node.js 18+ (20 recommended; see `.nvmrc` – use `nvm use` or `fnm use` if you use a version manager)
- **Language**: TypeScript 5.x
- **Discord**: discord.js v14
- **Database**: SQLite (better-sqlite3)
- **Logging**: pino
- **Quality**: ESLint, Prettier, Husky
- **Ops**: Docker, Docker Compose, Dependabot, DevContainer

---

## Project Structure

- **Games**: `gameLogic.ts` (pure rules), `ui.ts` (Discord components), `*Store.ts` (database). Shared stats in `services/gameStats/`. Timeouts in `src/constants.ts`. Long flows split into subfolders: `tictactoe/vsBot.ts`, `vsPlayer.ts`; `darts/stats.ts`, `solo.ts`, `challenge.ts`; `slots/gameLogic.ts`, `slotsStore.ts`; `hangman/play.ts`, `statsDisplay.ts`, `words.ts`; `connect4/pvp.ts`. **Daily** in `daily/dailyStore.ts`. **Stats** in `stats/fetchers.ts`, `stats/buildEmbed.ts`. **Achievements** in `achievements/definitions.ts`, `embedBuilder.ts`. **Starboard** in `services/starboard/starboardStore.ts`, `starboardEmbed.ts`.
- **Database**: SQLite via `services/database/db.ts`; `getRow<T>()` and `getAll<T>()` for typed query results. Giveaway store, joke store, reminders, stats fetchers, and quote use these helpers.
- **Help**: Topic text in `src/commands/help/topics/*.ts` (overview, changelog, summary in `topics/meta/`).
- **Interactions**: Main router in `src/services/discord/interaction/interactionHandler.ts`; handlers in `handlers/` (autocomplete, modals, buttons, context menus).
- **Fun command**: `fun.ts` (definition), `execute.ts` (routing + handler registry), `autocomplete.ts` (remind/quote IDs). Subcommands in `subcommands/`; groups in `funSubcommands/` (gamesGroup, utilityGroup, etc.). **Reminders**: single source in `services/reminders/store.ts`; fun command uses it (no duplicate DB logic).
- **Info command**: `info.ts` (definition); handlers in `info/handlers/` (userInfo, serverInfo, avatar).
- **Analytics**: Game metrics in `services/fun/gameUsageMetrics.ts`; non-game in `services/analytics/commandUsageStore.ts`.
- **Logging context**: Request IDs in `services/logging/requestContext.ts`.
- **i18n**: `src/i18n/index.ts`; see [i18n docs](docs/i18n.md).

<details>
<summary>📁 Click to expand file structure</summary>

The tree below is a simplified overview. The repo uses **command groups** (`core/`, `games/`, `social/`, `other/`) and **service groups** (`core/`, `discord/`, `integrations/`, `stores/`). For the current layout, see [Project structure](docs/project-structure.md).

```plaintext

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
│   ├── pre-commit
│   └── pre-push
├── assets
│   ├── banner.png
│   └── omegabot.png
├── data
│   └── fun-usage.json
├── docs
│   ├── analytics.md
│   ├── commands.md
│   ├── dev-notes.md
│   ├── faq-admins.md
│   ├── faq.md
│   ├── project-structure.md
│   ├── grafana.md
│   ├── i18n.md
│   ├── improvements.md
│   ├── runbook.md
│   ├── setup-discord.md
│   ├── setup-env.md
│   ├── transcripts.md
│   └── troubleshooting.md
├── grafana
│   └── omegabot-dashboard.json
├── .devcontainer
│   └── devcontainer.json
├── migrations
│   ├── 001_*.sql
│   ├── 004_command_usage_daily.sql
│   ├── schema.sql
│   └── ...
├── scripts
│   ├── backup-db.sh
│   ├── check-discord-version.mjs
│   ├── db-check.ts
│   ├── e2e-discord.mjs
│   ├── precheck.sh
│   └── seed-dev-db.mjs
├── src
│   ├── commands
│   │   ├── achievements
│   │   │   ├── achievements.test.ts
│   │   │   ├── achievements.ts
│   │   │   ├── definitions.ts
│   │   │   └── embedBuilder.ts
│   │   ├── admin
│   │   │   ├── subcommands
│   │   │   │   ├── ban.ts
│   │   │   │   ├── health.integration.test.ts
│   │   │   │   ├── health.ts
│   │   │   │   ├── kick.ts
│   │   │   │   ├── stats.ts
│   │   │   │   └── timeout.ts
│   │   │   ├── admin.ts
│   │   │   └── utils.ts
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
│   │   │   ├── autocomplete.ts
│   │   │   ├── execute.ts
│   │   │   ├── subcommands
│   │   │   │   ├── blackjack
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── connect4
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   ├── pvp.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── darts
│   │   │   │   │   ├── challenge.ts
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   ├── solo.ts
│   │   │   │   │   ├── stats.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── hangman
│   │   │   │   │   ├── hangmanStats.ts
│   │   │   │   │   ├── play.ts
│   │   │   │   │   ├── statsDisplay.ts
│   │   │   │   │   ├── ui.ts
│   │   │   │   │   ├── words.ts
│   │   │   │   ├── joke
│   │   │   │   │   ├── add.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── list.ts
│   │   │   │   │   ├── random.ts
│   │   │   │   │   └── remove.ts
│   │   │   │   ├── rps
│   │   │   │   │   ├── challenge.ts
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   ├── stats.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── slots
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   └── slotsStore.ts
│   │   │   │   ├── tictactoe
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   ├── ui.ts
│   │   │   │   │   ├── vsBot.ts
│   │   │   │   │   └── vsPlayer.ts
│   │   │   │   ├── trivia
│   │   │   │   │   └── questions.ts
│   │   │   │   ├── wordle
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── blackjack.ts
│   │   │   │   ├── blackjackStore.ts
│   │   │   │   ├── coinflip.ts
│   │   │   │   ├── coinflipstats.ts
│   │   │   │   ├── connect4.ts
│   │   │   │   ├── connect4Store.ts
│   │   │   │   ├── daily
│   │   │   │   │   └── dailyStore.ts
│   │   │   │   ├── daily.test.ts
│   │   │   │   ├── daily.ts
│   │   │   │   ├── darts.ts
│   │   │   │   ├── dartsStore.ts
│   │   │   │   ├── dice.integration.test.ts
│   │   │   │   ├── dice.ts
│   │   │   │   ├── eightball.ts
│   │   │   │   ├── fact.ts
│   │   │   │   ├── hangman.test.ts
│   │   │   │   ├── hangman.ts
│   │   │   │   ├── leaderboard.ts
│   │   │   │   ├── poll.ts
│   │   │   │   ├── quote.ts
│   │   │   │   ├── reminders.ts
│   │   │   │   ├── rps.test.ts
│   │   │   │   ├── rps.ts
│   │   │   │   ├── rpsStore.ts
│   │   │   │   ├── slots.integration.test.ts
│   │   │   │   ├── slots.test.ts
│   │   │   │   ├── slots.ts
│   │   │   │   ├── stats
│   │   │   │   │   ├── buildEmbed.ts
│   │   │   │   │   └── fetchers.ts
│   │   │   │   ├── stats.ts
│   │   │   │   ├── tictactoe.ts
│   │   │   │   ├── tictactoeStore.test.ts
│   │   │   │   ├── tictactoeStore.ts
│   │   │   │   ├── trivia.test.ts
│   │   │   │   ├── trivia.ts
│   │   │   │   ├── triviaStore.ts
│   │   │   │   ├── weather.ts
│   │   │   │   ├── wordle.test.ts
│   │   │   │   ├── wordle.ts
│   │   │   │   ├── wordleStore.ts
│   │   │   │   └── wouldYouRather.ts
│   │   │   ├── coinflipStore.test.ts
│   │   │   ├── coinflipStore.ts
│   │   │   ├── coinStore.ts
│   │   │   ├── fun.ts
│   │   │   └── funSubcommands
│   │   │       ├── gamesGroup.ts
│   │   │       ├── hangmanGroup.ts
│   │   │       ├── index.ts
│   │   │       ├── quoteGroup.ts
│   │   │       ├── remindGroup.ts
│   │   │       └── utilityGroup.ts
│   │   ├── github
│   │   │   ├── gh.ts
│   │   │   ├── github.ts
│   │   │   ├── pr.ts
│   │   │   └── status.ts
│   │   ├── giveaway
│   │   │   ├── buttonHandler.ts
│   │   │   ├── giveaway.ts
│   │   │   ├── giveawayStore.test.ts
│   │   │   └── giveawayStore.ts
│   │   ├── help
│   │   │   ├── help.ts
│   │   │   ├── helpText.ts
│   │   │   └── topics
│   │   │       ├── meta
│   │   │       │   ├── changelog.ts
│   │   │       │   ├── overview.ts
│   │   │       │   └── summary.ts
│   │   │       ├── admin.ts
│   │   │       ├── commands.ts
│   │   │       ├── fun.ts
│   │   │       ├── games.ts
│   │   │       ├── github.ts
│   │   │       ├── info.ts
│   │   │       ├── profile.ts
│   │   │       ├── quotes.ts
│   │   │       └── status.ts
│   │   ├── history
│   │   │   └── history.ts
│   │   ├── info
│   │   │   ├── handlers
│   │   │   │   ├── avatar.ts
│   │   │   │   ├── serverInfo.ts
│   │   │   │   └── userInfo.ts
│   │   │   └── info.ts
│   │   ├── ping
│   │   │   ├── ping.integration.test.ts
│   │   │   └── ping.ts
│   │   ├── playback
│   │   │   └── playback.ts
│   │   ├── quote-message
│   │   │   └── quote-message.ts
│   │   ├── profile
│   │   │   ├── profile.ts
│   │   │   ├── profileHelpers.ts
│   │   │   ├── timezones.ts
│   │   │   └── subcommands
│   │   │       ├── afk.ts
│   │   │       ├── timezone.ts
│   │   │       └── view.ts
│   │   ├── status
│   │   │   └── status.ts
│   │   ├── summarize-message
│   │   │   └── summarize-message.ts
│   │   ├── suggestion
│   │   │   └── suggestion.ts
│   │   ├── summary
│   │   │   └── summary.ts
│   │   ├── view-achievements
│   │   │   └── view-achievements.ts
│   │   └── view-profile
│   │       └── view-profile.ts
│   ├── config
│   │   └── env.ts
│   ├── i18n
│   │   └── index.ts
│   ├── services
│   │   ├── starboard
│   │   │   ├── starboardEmbed.ts
│   │   │   ├── starboardHandler.ts
│   │   │   ├── starboardStore.test.ts
│   │   │   └── starboardStore.ts
│   │   ├── analytics
│   │   │   └── commandUsageStore.ts
│   │   ├── ai
│   │   │   └── claudeService.ts
│   │   ├── cache
│   │   │   └── simpleCache.ts
│   │   ├── circuitBreaker
│   │   │   ├── breakers.ts
│   │   │   └── circuitBreaker.ts
│   │   ├── config
│   │   │   ├── guildConfigStore.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── database
│   │   │   ├── db.ts
│   │   │   └── migrations.ts
│   │   ├── metrics
│   │   │   └── server.ts
│   │   ├── discord
│   │   │   ├── handlers
│   │   │   │   ├── autocomplete.ts
│   │   │   │   ├── buttons.ts
│   │   │   │   ├── contextMenus.ts
│   │   │   │   └── modals.ts
│   │   │   ├── interaction
│   │   │   │   ├── interactionErrors.ts
│   │   │   │   ├── interactionHandler.ts
│   │   │   │   └── tracedInteractionHandler.ts
│   │   │   ├── commandLoader.ts
│   │   │   ├── commandMeta.ts
│   │   │   ├── commandTypes.ts
│   │   │   ├── cooldowns.ts
│   │   │   ├── fetchChannelMessages.ts
│   │   │   ├── rateLimit.test.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── safeReply.ts
│   │   ├── gameStats
│   │   │   ├── gameStats.test.ts
│   │   │   └── gameStats.ts
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
│   │   │   ├── funUsageStore.test.ts
│   │   │   ├── funUsageStore.ts
│   │   │   ├── gameUsageMetrics.test.ts
│   │   │   ├── gameUsageMetrics.ts
│   │   │   └── pollStore.ts
│   │   ├── github
│   │   │   ├── githubApi.ts
│   │   │   ├── githubCache.ts
│   │   │   ├── githubClient.ts
│   │   │   ├── githubErrorMessage.ts
│   │   │   ├── issueAssigneePoller.ts
│   │   │   ├── issueAssigneePollerState.ts
│   │   │   ├── lastSeenStore.ts
│   │   │   ├── prFormatter.ts
│   │   │   ├── prPoller.ts
│   │   │   └── types.ts
│   │   ├── joke
│   │   │   └── jokeStore.ts
│   │   ├── logging
│   │   │   ├── index.ts
│   │   │   └── requestContext.ts
│   │   ├── quotes
│   │   │   └── quoteStore.ts
│   │   ├── reminders
│   │   │   ├── index.ts
│   │   │   ├── scheduler.ts
│   │   │   ├── schema.ts
│   │   │   └── store.ts
│   │   ├── roles
│   │   │   └── autoRoleHandler.ts
│   │   ├── statuspage
│   │   │   └── statuspageApi.ts
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
│   ├── types
│   │   └── discord-client.d.ts
│   ├── utils
│   │   ├── colors.ts
│   │   ├── constants.ts
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
