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

- 15 slash commands with logical grouping
- 13 interactive games
- 19 unlockable achievements
- Giveaway system with automatic winners
- Starboard message highlights
- AFK and timezone management
- GitHub PR and issue lookups
- SQLite persistence for all data

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

---

## Operational Notes

- Designed to run as a long-lived process
- Safe to restart (state persisted in SQLite)
- Background pollers never crash the process
- Optional features auto-disable when misconfigured

---

## Documentation

- [Command Reference](docs/commands.md)
- [Discord Bot Setup](docs/setup-discord.md)
- [Environment Setup](docs/setup-env.md)
- [Development Notes](docs/dev-notes.md)

---

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Discord**: discord.js v14
- **Database**: SQLite (better-sqlite3)
- **Logging**: pino
- **Quality**: ESLint, Prettier, Husky

---

## Project Structure

<details>
<summary>📁 Click to expand file structure</summary>

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
│   ├── commands.md
│   ├── dev-notes.md
│   ├── faq.md
│   ├── setup-discord.md
│   ├── setup-env.md
│   └── transcripts.md
├── migrations
│   ├── 001_rps_stats.sql
│   └── schema.sql
├── scripts
│   ├── db-check.ts
│   └── precheck.sh
├── src
│   ├── commands
│   │   ├── achievements
│   │   │   ├── achievements.test.ts
│   │   │   └── achievements.ts
│   │   ├── admin
│   │   │   ├── subcommands
│   │   │   │   ├── ban.ts
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
│   │   │   ├── subcommands
│   │   │   │   ├── blackjack
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── connect4
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── joke
│   │   │   │   │   ├── add.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── list.ts
│   │   │   │   │   ├── random.ts
│   │   │   │   │   └── remove.ts
│   │   │   │   ├── rps
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── tictactoe
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── trivia
│   │   │   │   │   └── questions.ts
│   │   │   │   ├── ttt
│   │   │   │   ├── wordle
│   │   │   │   │   ├── gameLogic.ts
│   │   │   │   │   └── ui.ts
│   │   │   │   ├── blackjack.ts
│   │   │   │   ├── blackjackStore.ts
│   │   │   │   ├── coinflip.ts
│   │   │   │   ├── coinflipstats.ts
│   │   │   │   ├── connect4.ts
│   │   │   │   ├── connect4Store.ts
│   │   │   │   ├── daily.test.ts
│   │   │   │   ├── daily.ts
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
│   │   │   │   ├── slots.test.ts
│   │   │   │   ├── slots.ts
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
│   │   │   └── funSubcommands.ts
│   │   ├── general
│   │   │   └── ping.ts
│   │   ├── github
│   │   │   ├── gh.ts
│   │   │   ├── pr.ts
│   │   │   └── status.ts
│   │   ├── giveaway
│   │   │   ├── giveaway.ts
│   │   │   ├── giveawayStore.test.ts
│   │   │   └── giveawayStore.ts
│   │   ├── help
│   │   │   ├── help.ts
│   │   │   └── helpText.ts
│   │   ├── history
│   │   │   └── history.ts
│   │   ├── info
│   │   │   └── info.ts
│   │   ├── playback
│   │   │   └── playback.ts
│   │   ├── profile
│   │   │   └── profile.ts
│   │   ├── suggestion
│   │   │   └── suggestion.ts
│   │   └── summary
│   │       └── summary.ts
│   ├── config
│   │   └── env.ts
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
│   │   ├── reminders
│   │   │   ├── index.ts
│   │   │   ├── scheduler.ts
│   │   │   ├── schema.ts
│   │   │   └── store.ts
│   │   ├── roles
│   │   │   └── autoRoleHandler.ts
│   │   ├── starboard
│   │   │   ├── starboardHandler.ts
│   │   │   └── starboardStore.test.ts
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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint && npm run typecheck`
5. Run `npm test` to verify tests pass
6. Submit a pull request

---

## Testing

```bash
npm test          # Run tests in watch mode
npm run test:run  # Run tests once
npm run test:coverage  # Run with coverage report
```

14 test files covering games, stores, and core functionality.

---

## License

This project is licensed under the MIT License.
See the [LICENSE](./LICENSE) file for details.
