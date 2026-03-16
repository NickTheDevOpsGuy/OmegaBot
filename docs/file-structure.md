# File and folder structure

This page shows a full directory tree of the repo. For a narrative overview of where major systems live, see [Project structure](project-structure.md).

<details>
<summary>📁 Click to expand file structure</summary>

The tree below is a simplified overview. The repo uses **command groups** (`core/`, `games/`, `social/`, `other/`) and **service groups** (`core/`, `discord/`, `integrations/`, `stores/`).

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
│   │   └── …
│   └── src
│       └── …
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
│   ├── file-structure.md
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
│   ├── troubleshooting.md
│   └── …
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
│   │   │   ├── faq
│   │   │   ├── help
│   │   │   │   ├── topics
│   │   │   │   │   ├── meta
│   │   │   │   │   ├── admin.ts
│   │   │   │   │   ├── fun.ts
│   │   │   │   │   ├── games.ts
│   │   │   │   │   ├── github.ts
│   │   │   │   │   ├── info.ts
│   │   │   │   │   ├── event.ts
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
│   │   │   ├── event
│   │   │   │   └── event.ts
│   │   │   ├── profile
│   │   │   ├── rules
│   │   │   ├── status
│   │   │   └── suggestion
│   │   ├── games
│   │   │   ├── achievements
│   │   │   ├── fun
│   │   │   │   ├── funSubcommands
│   │   │   │   │   ├── gamesGroup.ts
│   │   │   │   │   ├── hangmanGroup.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── quoteGroup.ts
│   │   │   │   │   └── utilityGroup.ts
│   │   │   │   ├── subcommands
│   │   │   │   │   ├── games-a
│   │   │   │   │   │   ├── blackjack
│   │   │   │   │   │   ├── chess
│   │   │   │   │   │   ├── connect4
│   │   │   │   │   │   ├── daily
│   │   │   │   │   │   ├── darts
│   │   │   │   │   │   ├── dice
│   │   │   │   │   │   └── hangman
│   │   │   │   │   ├── games-b
│   │   │   │   │   │   ├── higherlower
│   │   │   │   │   │   ├── memory
│   │   │   │   │   │   ├── rps
│   │   │   │   │   │   ├── slots
│   │   │   │   │   │   ├── stats
│   │   │   │   │   │   ├── tictactoe
│   │   │   │   │   │   ├── trivia
│   │   │   │   │   │   └── wordle
│   │   │   │   │   ├── shared
│   │   │   │   │   ├── social
│   │   │   │   │   │   ├── fact
│   │   │   │   │   │   ├── joke
│   │   │   │   │   │   ├── leaderboard
│   │   │   │   │   │   ├── poll
│   │   │   │   │   │   ├── quote
│   │   │   │   │   │   └── wouldYouRather
│   │   │   │   │   └── utility
│   │   │   │   │       ├── chat
│   │   │   │   │   ├── choose
│   │   │   │   │   ├── coinflip
│   │   │   │   │   ├── coinflipstats
│   │   │   │   │   ├── compliment
│   │   │   │   │   ├── eightball
│   │   │   │   │   ├── quest
│   │   │   │   │   ├── reminders
│   │   │   │   │   ├── roast
│   │   │   │   │   └── weather
│   │   │   │   ├── autocomplete.ts
│   │   │   │   ├── execute.ts
│   │   │   │   └── fun.ts
│   │   │   ├── giveaway
│   │   │   └── view-achievements
│   │   ├── other
│   │   │   ├── github
│   │   │   ├── ping
│   │   │   ├── playback
│   │   │   └── view-profile
│   │   └── social
│   │       ├── history
│   │       ├── quote-message
│   │       ├── summarize-message
│   │       └── summary
│   ├── config
│   │   └── env.ts
│   ├── i18n
│   │   └── index.ts
│   ├── services
│   │   ├── core
│   │   │   ├── analytics
│   │   │   ├── cache
│   │   │   ├── circuitBreaker
│   │   │   ├── config
│   │   │   ├── dashboard
│   │   │   ├── database
│   │   │   ├── logging
│   │   │   ├── metrics
│   │   │   └── time
│   │   ├── discord
│   │   │   └── discord
│   │   │       ├── handlers
│   │   │       ├── interaction
│   │   │       ├── rateLimit
│   │   │       ├── commandLoader.ts
│   │   │       ├── safeReply.ts
│   │   │       └── …
│   │   ├── integrations
│   │   │   ├── ai
│   │   │   ├── faq
│   │   │   ├── github
│   │   │   ├── starboard
│   │   │   ├── statuspage
│   │   │   ├── summary
│   │   │   ├── weather
│   │   │   └── welcome
│   │   └── stores
│   │       ├── fun
│   │       ├── gameStats
│   │       ├── joke
│   │       ├── progression
│   │       ├── quotes
│   │       ├── reminders
│   │       ├── roles
│   │       ├── timezone
│   │       └── transcript
│   ├── types
│   │   └── discord-client.d.ts
│   ├── utils
│   │   ├── colors.ts
│   │   ├── constants.ts
│   │   ├── errors.ts
│   │   ├── interactions.ts
│   │   └── logger.ts
│   ├── web
│   │   ├── api
│   │   │   ├── achievements.ts
│   │   │   ├── events.ts
│   │   │   ├── games.ts
│   │   │   ├── leaderboard.ts
│   │   │   ├── posts.ts
│   │   │   └── profile.ts
│   │   ├── auth.ts
│   │   ├── authRoutes.ts
│   │   ├── rateLimit.ts
│   │   ├── server.ts
│   │   └── sse.ts
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
