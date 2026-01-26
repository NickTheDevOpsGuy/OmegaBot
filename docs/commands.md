# OmegaBot Command Reference

All fun commands are available under `/fun`:

## Games

| Command | Description |
|---------|-------------|
| `/fun 8ball` | Ask the magic 8-ball a question |
| `/fun rps` | Rock paper scissors (solo or `opponent:@user` for PvP) |
| `/fun tictactoe` | Tic Tac Toe (solo or `opponent:@user` for PvP) |
| `/fun trivia` | Trivia questions with points, streaks, and leaderboard |
| `/fun blackjack` | Play blackjack vs the dealer with Hit/Stand buttons |
| `/fun connect4` | Play Connect 4 vs another user |
| `/fun hangman` | Classic word guessing with letter buttons |
| `/fun wordle` | Daily word puzzle (same word for everyone each day) |
| `/fun slots` | Spin the slot machine for jackpots |
| `/fun would-you-rather` | Vote on random Would You Rather questions |
| `/fun coinflip` | Heads or tails |
| `/fun dice` | Custom dice rolls (2-100 sides, 1-10 dice) |
| `/fun poll` | Create polls with 2-4 options |

### Game Options

Most games support these options:
- `stats:true` - View your stats for that game
- `private:true` - Make the response visible only to you

### Slots Options

- `stats:true` - View your slots stats
- `leaderboard:true` - Show jackpot leaderboard
- `paytable:true` - Show symbol payouts and odds

## Quotes & Jokes

| Command | Description |
|---------|-------------|
| `/fun quote add` | Save a memorable server quote |
| `/fun quote random` | Get a random quote |
| `/fun quote list` | Browse recent quotes |
| `/fun quote search` | Search quotes by text |
| `/fun quote remove` | Remove a quote by ID |
| `/fun joke random` | Get a random community joke |
| `/fun joke add` | Add a new joke |
| `/fun joke list` | Browse jokes |
| `/fun joke remove` | Remove a joke |

## Daily & Stats

| Command | Description |
|---------|-------------|
| `/fun daily` | Daily check-in for points and streaks |
| `/fun stats` | View all your game stats in one place |
| `/fun coinflipstats` | Coin flip statistics with emoji bars |
| `/fun leaderboard` | Fun command usage and top users |

## Utility

| Command | Description |
|---------|-------------|
| `/fun remind` | Set reminders (1 min to 7 days) |
| `/fun weather` | Current weather for a location |
| `/fun weather7` | 7-day forecast |
| `/fun fact` | Random interesting facts |

---

## Core Commands

| Command | Description |
|---------|-------------|
| `/help` | Command discovery and getting started guide |
| `/ping` | Health check |
| `/afk` | Set AFK status (auto-replies when pinged) |
| `/userinfo` | View info about a user |
| `/serverinfo` | View info about the server |
| `/avatar` | View a user's avatar (multiple sizes) |
| `/timezone` | Set, view, and compare timezones |
| `/achievements` | View your unlocked achievements |

---

## Giveaway System

| Command | Description |
|---------|-------------|
| `/giveaway start` | Create a new giveaway with prize, duration, and winner count |
| `/giveaway end` | End a giveaway early and pick winners |
| `/giveaway reroll` | Pick new winners for an ended giveaway |
| `/giveaway list` | List all active giveaways in the server |

**Usage:**
```
/giveaway start prize:"Steam Gift Card" duration:"1d" winners:3
```

Durations: `10s`, `30m`, `1h`, `1d` (min 10 seconds, max 30 days)

---

## Suggestion System

| Command | Description |
|---------|-------------|
| `/suggestion submit` | Submit an idea for the server |
| `/suggestion approve` | Approve a suggestion (mods) |
| `/suggestion deny` | Deny a suggestion (mods) |
| `/suggestion implement` | Mark suggestion as implemented (mods) |
| `/suggestion list` | View recent suggestions |
| `/suggestion setchannel` | Set the suggestions channel (admins) |

---

## Server Configuration

| Command | Description |
|---------|-------------|
| `/starboard setup` | Configure starboard channel and threshold |
| `/starboard status` | View current starboard settings |
| `/starboard clear` | Disable starboard |
| `/config` | Server configuration (admins) |

---

## Achievements

Achievements are unlocked automatically as you use the bot. View with `/achievements`.

### 🎮 Games
- **First Victory** - Win your first game
- **Getting Good** - Win 10 games total
- **Champion** - Win 50 games total
- **Natural 21** - Get a blackjack
- **Wordle Wizard** - Get a 7-day Wordle streak

### 🍀 Luck
- **Jackpot!** - Hit a slot machine jackpot
- **Lucky Streak** - Win slots 5 times
- **Coin Master** - Flip 100 coins

### 💪 Dedication
- **Week Warrior** - 7-day daily check-in streak
- **Month Master** - 30-day daily check-in streak
- **Trivia Master** - Answer 50 trivia questions correctly
- **On Fire** - Get a 10-question trivia streak

### 💬 Social
- **Quotable** - Have one of your quotes saved

---

## GitHub Integration

| Command | Description |
|---------|-------------|
| `/gh status` | Check GitHub API status |
| `/gh pr` | Look up a pull request |
| `/gh issue` | Look up an issue |

---

## FAQ System

| Command | Description |
|---------|-------------|
| `/faq add` | Create a new FAQ entry |
| `/faq get` | Retrieve an FAQ by key |
| `/faq list` | List all FAQs |
| `/faq remove` | Remove an FAQ (with confirmation) |

---

## Summary & History

| Command | Description |
|---------|-------------|
| `/summary` | Generate conversation summary (local + LLM modes) |
| `/history` | View conversation history |
| `/playback` | Transcript playback with pagination |

---
