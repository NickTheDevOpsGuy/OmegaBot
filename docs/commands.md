# OmegaBot Command Reference

OmegaBot has **15 slash commands** organized into logical groups.

---

## `/fun` - Games & Entertainment

The main hub for all games and fun features.

### Games (14)

| Command                   | Description                            |
| ------------------------- | -------------------------------------- |
| `/fun 8ball`              | Ask the magic 8-ball                   |
| `/fun rps`                | Rock paper scissors (solo or PvP)      |
| `/fun tictactoe`          | Tic Tac Toe (solo or PvP)              |
| `/fun trivia`             | Trivia with points and streaks         |
| `/fun blackjack`          | Interactive blackjack                  |
| `/fun connect4`           | PvP Connect 4                          |
| `/fun hangman play`       | Hangman (dropdown letters, difficulty) |
| `/fun hangman stats`      | Hangman stats (wins, fastest time)     |
| `/fun hangman words add`  | (Admin) Add word to list               |
| `/fun hangman words list` | (Admin) List words                     |
| `/fun wordle`             | Daily word puzzle                      |
| `/fun slots`              | Slot machine with jackpots             |
| `/fun darts`              | Throw 3 darts (solo or PvP), stats, leaderboards (best/180/PvP) |
| `/fun would-you-rather`   | WYR questions                          |
| `/fun coinflip`           | Heads or tails                         |
| `/fun dice`               | Custom dice rolls                      |
| `/fun poll`               | Create polls                           |

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

| Command              | Description                 |
| -------------------- | --------------------------- |
| `/fun remind set`    | Set a reminder (5m, 1h, 1d) |
| `/fun remind list`   | View pending reminders      |
| `/fun remind cancel` | Cancel a reminder           |
| `/fun remind clear`  | Cancel all reminders        |

### Quotes & Jokes

| Command      | Description      |
| ------------ | ---------------- |
| `/fun quote` | Save/view quotes |
| `/fun joke`  | Community jokes  |

### Utility

| Command         | Description     |
| --------------- | --------------- |
| `/fun weather`  | Current weather |
| `/fun weather7` | 7-day forecast  |
| `/fun fact`     | Random facts    |

---

## `/profile` - User Profile

Manage your profile, AFK status, and timezone.

| Command             | Description                         |
| ------------------- | ----------------------------------- |
| `/profile view`     | View your or another user's profile |
| `/profile afk`      | Set/clear AFK status                |
| `/profile timezone` | Set/view timezone                   |

---

## `/info` - Information

Get info about users or the server.

| Command        | Description            |
| -------------- | ---------------------- |
| `/info user`   | View user information  |
| `/info server` | View server statistics |
| `/info avatar` | View user's avatar     |

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

| Command            | Description           |
| ------------------ | --------------------- |
| `/giveaway start`  | Create a giveaway     |
| `/giveaway end`    | End early             |
| `/giveaway reroll` | Pick new winners      |
| `/giveaway list`   | List active giveaways |

---

## `/suggestion` - Suggestion System

| Command                 | Description      |
| ----------------------- | ---------------- |
| `/suggestion submit`    | Submit an idea   |
| `/suggestion approve`   | Approve (mods)   |
| `/suggestion deny`      | Deny (mods)      |
| `/suggestion implement` | Mark implemented |
| `/suggestion list`      | View suggestions |

---

## `/config` - Server Configuration

Requires **Manage Server** permission.

| Command                    | Description             |
| -------------------------- | ----------------------- |
| `/config view`             | View all settings       |
| `/config welcome set`      | Set welcome channel     |
| `/config welcome clear`    | Clear welcome channel   |
| `/config starboard set`    | Set up starboard        |
| `/config starboard status` | View starboard settings |
| `/config starboard clear`  | Disable starboard       |

---

## `/faq` - FAQ System

| Command       | Description      |
| ------------- | ---------------- |
| `/faq add`    | Create FAQ entry |
| `/faq get`    | Retrieve FAQ     |
| `/faq list`   | List all FAQs    |
| `/faq remove` | Remove FAQ       |

---

## `/gh` - GitHub Integration

| Command      | Description       |
| ------------ | ----------------- |
| `/gh status` | GitHub API status |
| `/gh pr`     | Look up PR        |
| `/gh issue`  | Look up issue     |

---

## Other Commands

| Command     | Description                                        |
| ----------- | -------------------------------------------------- |
| `/help`     | Command help (use `topic:changelog` for changelog) |
| `/ping`     | Health check                                       |
| `/summary`  | Summarize chat                                     |
| `/history`  | View chat history                                  |
| `/playback` | Transcript playback                                |
| `/admin`    | Admin tools                                        |

---

## Command Count Summary

| Category          | Commands                                           |
| ----------------- | -------------------------------------------------- |
| Core              | 6 (help, ping, info, profile, achievements, admin) |
| Fun               | 1 (with 25+ subcommands)                           |
| Server Management | 3 (config, giveaway, suggestion)                   |
| Content           | 4 (faq, summary, history, playback)                |
| Integration       | 1 (gh)                                             |
| **Total**         | **15 slash commands**                              |

---
