# OmegaBot Command Reference

This file is the **single source of truth** for command behavior; update it when adding or changing commands.

OmegaBot has **17 slash commands** organized into logical groups.

---

## `/fun` - Games & Entertainment

The main hub for all games and fun features.

### Games (14)

| Command                   | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| `/fun 8ball`              | Ask the magic 8-ball                                            |
| `/fun rps`                | Rock paper scissors (solo or PvP)                               |
| `/fun tictactoe`          | Tic Tac Toe (solo or PvP)                                       |
| `/fun trivia`             | Trivia with points and streaks                                  |
| `/fun blackjack`          | Interactive blackjack                                           |
| `/fun connect4`           | PvP Connect 4                                                   |
| `/fun hangman play`       | Hangman (dropdown letters, difficulty)                          |
| `/fun hangman stats`      | Hangman stats (wins, fastest time)                              |
| `/fun hangman words add`  | (Admin) Add word to list                                        |
| `/fun hangman words list` | (Admin) List words                                              |
| `/fun wordle`             | Daily word puzzle                                               |
| `/fun slots`              | Slot machine with jackpots                                      |
| `/fun darts`              | Throw 3 darts (solo or PvP), stats, leaderboards (best/180/PvP) |
| `/fun would-you-rather`   | WYR questions                                                   |
| `/fun coinflip`           | Heads or tails                                                  |
| `/fun choose`             | Pick one or more options at random (e.g. pizza, pasta, salad)   |
| `/fun dice`               | Roll dice (notation: 2d6+3, or sides/count)                     |
| `/fun poll`               | Create polls                                                    |

**Rate limits** (per user, to prevent spam):

- Slots: 3 seconds between spins
- Blackjack: 5 seconds between games
- Dice: 2 seconds between rolls
- Darts: 2 seconds between throws
- Hangman: 10 seconds between games

Stats and leaderboard views are not rate limited.

**Hangman**

- Words are stored in SQLite; choose **difficulty** (easy / medium / hard) when starting a game.
- Letter selection uses **dropdowns** (A–M and N–Z) so every letter (including Z) is available.
- Stats include **fastest win** and **average solve time**.
- Users with the role set in **`HANGMAN_ADMIN_ROLE_ID`** (in `.env`) can add and list words via `/fun hangman words add` and `/fun hangman words list`.

**Game timeouts & extend time**

- **Blackjack, Hangman, Wordle, RPS challenge**: 1 hour per game/session; the player who started can use **Extend time** to add another hour.
- **Connect 4, Tic Tac Toe (PvP)**: 10 minutes per move; the person who started the game can use **Extend time** to add 10 more minutes for the current turn. A reminder appears 1 minute before timeout.
- **Tic Tac Toe (vs bot)**: Up to 90 minutes total; the player can extend time.
- **Trivia**: 30 seconds per question (unchanged).

### Stats & Daily

| Command            | Description               |
| ------------------ | ------------------------- |
| `/fun daily`       | Daily check-in for points |
| `/fun stats`       | View all game stats       |
| `/fun leaderboard` | Top players               |

### Reminders

| Command              | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `/fun remind set`    | Set a reminder (5m, 1h, 1d)                                          |
| `/fun remind list`   | View pending reminders                                               |
| `/fun remind snooze` | Reschedule a reminder (ID + time, e.g. 30m, 1h; ID has autocomplete) |
| `/fun remind cancel` | Cancel a reminder (ID has autocomplete)                              |
| `/fun remind clear`  | Cancel all reminders                                                 |

### Quotes & Jokes

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `/fun quote add`    | Add a quote                                        |
| `/fun quote random` | Get a random quote                                 |
| `/fun quote list`   | List recent quotes (limit: 5, 10, 25; default: 25) |
| `/fun quote remove` | Remove a quote (ID has autocomplete)               |
| `/fun quote search` | Search quotes (limit: 5, 10, 25)                   |
| `/fun joke`         | Community jokes                                    |

### Utility

| Command         | Description     |
| --------------- | --------------- |
| `/fun weather`  | Current weather |
| `/fun weather7` | 7-day forecast  |
| `/fun fact`     | Random facts    |

---

## `/profile` - User Profile

Manage your profile, AFK status, and timezone.

| Command             | Description                               |
| ------------------- | ----------------------------------------- |
| `/profile view`     | View your or another user's profile       |
| `/profile afk`      | Set/clear AFK status                      |
| `/profile timezone` | Set/view timezone (zone has autocomplete) |

---

## `/info` - Information

Get info about users or the server. Use `/help topic:info` for details.

| Command        | Description                                                                           |
| -------------- | ------------------------------------------------------------------------------------- |
| `/info user`   | View user information                                                                 |
| `/info server` | View server statistics; optional **invite** creates a 24h invite link for the channel |
| `/info time`   | Show current time for a user (uses their /profile timezone)                           |
| `/info avatar` | View user's avatar (size: 128–4096, format: png/jpg/webp/gif)                         |

---

## `/achievements` - Achievement System

View your unlocked achievements (19 total).

| Category      | Achievements                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| 🎮 Games      | First Victory, Getting Good, Champion, Natural 21, Wordle Wizard, Word Nerd, Hangman Hero, Card Shark, Connect Master |
| 🍀 Luck       | Jackpot!, Lucky Streak, Coin Master, High Roller                                                                      |
| 💪 Dedication | Week Warrior, Month Master, Trivia Master, On Fire                                                                    |
| 💬 Social     | Quotable, Generous                                                                                                    |

---

## `/giveaway` - Giveaway System

| Command            | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `/giveaway start`  | Create a giveaway                                     |
| `/giveaway end`    | End early (ID has autocomplete)                       |
| `/giveaway reroll` | Pick new winners for ended giveaway (ID autocomplete) |
| `/giveaway list`   | List active giveaways                                 |

---

## `/suggestion` - Suggestion System

Use `/suggestion` to submit an idea. A modal opens for multi-line input (up to 1000 characters).

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `/suggestion`           | Submit an idea (opens modal) |
| `/suggestion approve`   | Approve (mods)               |
| `/suggestion deny`      | Deny (mods)                  |
| `/suggestion implement` | Mark implemented             |
| `/suggestion list`      | View suggestions             |

---

## `/config` - Server Configuration

Requires **Manage Server** permission.

| Command                           | Description                  |
| --------------------------------- | ---------------------------- |
| `/config view`                    | View all settings            |
| `/config welcome set`             | Set welcome channel          |
| `/config welcome clear`          | Clear welcome channel        |
| `/config starboard set`          | Set up starboard             |
| `/config starboard status`       | View starboard settings      |
| `/config starboard clear`        | Disable starboard            |
| `/config rules set`              | Set rules channel            |
| `/config rules clear`            | Clear rules channel          |
| `/config moderator-role add`     | Add role that can use /admin |
| `/config moderator-role remove`  | Remove moderator role        |
| `/config moderator-role list`    | List moderator roles         |

---

## `/faq` - FAQ System

| Command       | Description                         |
| ------------- | ----------------------------------- |
| `/faq add`    | Create FAQ entry                    |
| `/faq get`    | Retrieve FAQ (key has autocomplete) |
| `/faq list`   | List all FAQs                       |
| `/faq remove` | Remove FAQ (key has autocomplete)   |

---

## `/gh` - GitHub Integration

| Command      | Description       |
| ------------ | ----------------- |
| `/gh status` | GitHub API status |
| `/gh pr`     | Look up PR        |
| `/gh issue`  | Look up issue     |

---

## `/status` - Service Status

Check external service status (infrastructure and LLM/AI).

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `/status vercel`    | Vercel platform status         |
| `/status supabase`  | Supabase platform status       |
| `/status chatgpt`   | OpenAI / ChatGPT status       |
| `/status claude`    | Anthropic Claude status       |
| `/status cursor`    | Cursor IDE status             |
| `/status llms`      | All LLM statuses at once       |

---

## Context Menus

### Right-click User

| Menu                  | Description                            |
| --------------------- | -------------------------------------- |
| **View Profile**      | View user profile, stats, achievements |
| **View Achievements** | View user's achievements               |

### Right-click Message

| Menu          | Description                                               |
| ------------- | --------------------------------------------------------- |
| **Summarize** | Summarize messages up to that one; DM you the result      |
| **Quote**     | Save the message as a quote (text or embed; human or bot) |

---

## `/admin` – Admin & Moderation

Restricted to users in **`ADMIN_USER_IDS`** (in `.env`) or with a server moderator role (Administrator, Manage Server, Moderate Members, or `/config moderator-role`). If **`MODERATION_ALLOWED_ROLE_IDS`** is set in `.env`, only those roles (and `ADMIN_USER_IDS`) can use timeout, kick, and ban; stats and health still use the normal moderator check. See [FAQ – Who can use /admin?](faq-admins.md#who-can-use-admin) and [Environment Setup – Admin / Moderation](setup-env.md#admin--moderation-optional).

| Subcommand   | Description                              |
| ------------ | ---------------------------------------- |
| `/admin timeout` | Timeout a user (5m–7d)                |
| `/admin kick`    | Kick a user from the server           |
| `/admin ban`     | Ban a user (optional message delete)   |
| `/admin stats`   | Bot statistics (uptime, DB, commands) |
| `/admin health`  | Health check (DB, env, errors)        |

---

## Other Commands

| Command     | Description                                                               |
| ----------- | ------------------------------------------------------------------------- |
| `/help`     | Command help (use `topic:changelog` for changelog)                        |
| `/ping`     | Health check                                                              |
| `/status`   | Vercel / Supabase status                                                  |
| `/rules`    | View server rules (link to configured channel)                           |
| `/summary`  | Summarize chat                                                            |
| `/history`  | View chat history                                                         |
| `/playback` | Transcript playback (`private`, `before`, `after` message IDs for paging) |
| `/admin`    | Admin tools (see [§ /admin](#admin--admin--moderation))                    |

---

## Command Count Summary

| Category          | Commands                                           |
| ----------------- | -------------------------------------------------- |
| Core              | 7 (help, ping, info, profile, achievements, admin, rules) |
| Fun               | 1 (with 25+ subcommands)                           |
| Server Management | 3 (config, giveaway, suggestion)                   |
| Content           | 4 (faq, summary, history, playback)                |
| Integration       | 2 (gh, status)                                     |
| **Total**         | **17 slash commands**                              |

---
