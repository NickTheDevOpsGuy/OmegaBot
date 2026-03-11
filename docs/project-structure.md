# Project structure

This doc describes the current folder layout. See [Development Notes](dev-notes.md) for conventions (file/folder limits, testing, logging).

## Commands (`src/commands/`)

Commands are grouped into four top-level folders (≤10 items each). The loader discovers `*/<name>/<name>.ts` under each group.

| Group   | Contents |
| ------- | -------- |
| **core/**  | admin, config, faq, help, info, profile, rules, status, suggestion |
| **games/** | achievements, fun, giveaway, view-achievements |
| **social/**| history, quote-message, summary, summarize-message |
| **other/** | github, ping, playback, view-profile |

- **Help topics:** `core/help/topics/*.ts`; meta content (overview, changelog, summary, commands) in `topics/meta/`.
- **Fun command:** `games/fun/` (execute, autocomplete, coinflipStore, coinStore, funSubcommands). Subcommands live under `fun/subcommands/` in four groups: **games-a/** (blackjack, connect4, daily, darts, dice, hangman), **games-b/** (rps, slots, stats, tictactoe, trivia, wordle), **social/** (joke, leaderboard, poll, quote, wouldYouRather, …), **utility/** (reminders, weather, …). Hangman has a `tests/` subfolder for its unit tests.

## Services (`src/services/`)

Services are grouped into four top-level folders (≤10 items each).

| Group           | Contents |
| --------------- | -------- |
| **core/**       | config, database, logging, metrics, cache, dashboard, circuitBreaker, analytics, time |
| **discord/**    | discord/ (commandLoader, commandMeta, handlers/, interaction/, rateLimit/, safeReply, …) |
| **integrations/** | ai, github, statuspage, faq, welcome, starboard, summary, weather |
| **stores/**     | quotes, reminders, timezone, transcript, gameStats, fun, joke, roles |

- **Database:** `core/database/` — `db.ts`, `migrations.ts`, `dbTestUtils.ts` (in-memory DB helper for tests).
- **Discord:** `discord/discord/` — interaction routing in `interaction/`, handlers in `handlers/`, rate limiting in `rateLimit/` (folder with index + implementation + test).
- **GitHub:** `integrations/github/` — shared types and error messages in `shared/`.

## Other under `src/`

- **config/** — env (e.g. `env.ts`).
- **i18n/** — locale strings.
- **types/** — e.g. `discord-client.d.ts`.
- **utils/** — logger, constants, colors, interactions.
- **bot.ts**, **registerCommands.ts** — entry and registration.

## Tests

Unit and integration tests are colocated: `*.test.ts` and `*.integration.test.ts` next to the code they test (or in a `tests/` subfolder when used). There is no `src/test` folder. DB-using tests import `useInMemoryDb` from `src/services/core/database/dbTestUtils.ts`. See [Development Notes → Testing](dev-notes.md#testing).
