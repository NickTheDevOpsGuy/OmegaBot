# Games development guide

This doc explains how to add games, use progression, achievements, and the shared result renderer. See also [Project structure](project-structure.md) and [File & folder structure](file-structure.md).

## Adding a new game

1. **Command and options**  
   Register the subcommand under `src/commands/games/fun/` (e.g. in `funSubcommands/gamesGroup.ts`) and add a handler in `execute.ts` that calls your game module.

2. **Game logic**  
   Keep logic in a dedicated module (e.g. `gameLogic.ts`, `slotsStore.ts`) under the game folder. Commands should stay thin and call into these modules.

3. **Result display**  
   Use the shared **game result renderer** for consistent embeds:
   - Import `buildGameResultEmbed` from `src/services/games/gameResultRenderer.js`.
   - Build a `GameResultInput` (title, outcome, boardLines, outcomeMessage, rewardLines, xpGained, footerHints, etc.) and call `buildGameResultEmbed(input)` to get an `EmbedBuilder` for `editReply({ embeds: [embed] })`.

4. **Progression**  
   Use `awardXp(userId, amount)` from `src/services/stores/progression/progressionStore.js` after a game ends. Use `buildMilestoneLine` and `buildRankTeaser` from `subcommands/shared/gameFeedback.js` for milestones and leaderboard teasers.

5. **Rate limiting**  
   Add a cooldown in `src/services/discord/discord/rateLimit/rateLimit.ts` (e.g. `checkSlotsCooldown`, `recordSlotsSpin`) and call `formatCooldownMessage` when the user is rate limited.

6. **Tests**  
   Add unit tests for logic and an integration test that mocks the interaction and asserts on the **final** `editReply` payload (e.g. embed title/description), not on intermediate states like "Spinning…".

## Progression system

- **XP and levels**  
  Stored in `user_progression`; use `getProgression(userId)` and `awardXp(userId, amount)` from `src/services/stores/progression/progressionStore.js`. Level math is in `progressionMath.js`.

- **Per-game stats**  
  Each game has its own store (e.g. `slotsStore.ts`, `blackjackStore.ts`) with tables in `migrations/schema.sql` or versioned migrations. Use these for wins, losses, streaks, and leaderboards.

- **Achievements**  
  Defined in `src/commands/games/achievements/definitions.ts`. Each achievement has a `checkFn(userId, db)`. After recording a game result, call `getNewlyUnlockedAchievementLine(userId, db, recordFn)` to get a one-line message for newly unlocked achievements.

- **Milestones and rank**  
  Use `buildMilestoneLine(before, after, [1, 5, 10, 25], "slots wins")` and `buildRankTeaser(rank, "jackpot")` from `subcommands/shared/gameFeedback.js`.

## Result rendering

`services/games/gameResultRenderer.ts` provides:

- **`buildGameResultEmbed(input: GameResultInput)`**  
  Returns an `EmbedBuilder` with:
  - Title (and optional subtitle)
  - Board/visual lines
  - Win/loss/draw message
  - Rewards field (XP, streak, leaderboard summary)
  - Achievements field (milestones, unlocked achievements)
  - Footer (hints like "Play again: /fun slots")

- **`buildGameResultReplyPayload(input)`**  
  Returns `{ embeds: [APIEmbed] }` for `editReply`.

Use this for slots, blackjack, and other embed-based games so output is consistent and mobile-friendly.

## Rare random events (optional)

`services/games/randomEvents.ts` provides `rollRandomEvent(config?)` which returns a rare bonus (Lucky Spin, Double XP, Bonus Coins, Jackpot Boost) or `kind: "none"`. Configurable `triggerChance` and weights. Apply `xpMultiplier` and `payoutMultiplier` to XP and payout when an event triggers. **Slots** uses this: when an event triggers, the result embed shows the event label (e.g. "🍀 Lucky Spin!") and the multipliers are applied to payout and XP.

## Persistent game sessions (async games)

For games that last days (e.g. Connect 4, Chess):

- **Table**  
  `game_sessions` (migrations `008_game_sessions.sql`, `009_game_sessions_status.sql`): `game_id`, `game_type`, `player1_id`, `player2_id`, `board_state`, `current_turn`, `created_at`, `updated_at`, `expires_at`, **`status`** (`active` | `finished` | `abandoned`). Default expiry 72 hours; configurable per game via `SESSION_EXPIRY_MS_BY_GAME`.

- **API**  
  `services/games/sessionManager.ts`: `getSession(gameId)`, `getSessionInternal(gameId, { activeOnly })`, `saveSession(session)`, `updateSessionStatus(gameId, status)`, `listActiveForUser(userId, gameType?)`, `deleteSession(gameId)`, `pruneExpiredSessions({ markAbandoned? })`, `getExpiryForGameType(gameType)`.

Store board state as JSON string. Commands and a future web API can load/save sessions so players can continue later.

**Connect 4** uses this: games stay active for 72 hours; each move extends the session by 24 hours. Use **`/fun connect4 continue: true`** to list active games and resume. Turn-based play works asynchronously (no 30‑minute move timeout).

## Game tiers (classification)

- **Tier 1 (text)**  
  Dice, coinflip, trivia — simple text or minimal embeds.
- **Tier 2 (embed)**  
  Slots, blackjack, poker — rich embeds with board, rewards, footer hints.
- **Tier 3 (future visual)**  
  Slots, blackjack, roulette, wheel — if visual rendering is added later, keep it as an opt-in layer on top of the existing text/embed flows.
