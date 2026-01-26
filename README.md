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

OmegaBot is a modular Discord bot designed to support development projects with quick summaries, FAQs, GitHub lookups, and automated notifications. It also includes a comprehensive suite of fun commands, games, and engagement features.

---

## Table of Contents

- [Features](#features)
- [Documentation](#documentation)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Extending OmegaBot](#extending-omegabot)
- [Contributors](#contributors)
- [License](#license)

---

## Current Features

### Core Features
- Modular slash-command system with auto-loading from `dist/commands`
- Centralized interaction routing with consistent, safe error handling
- Structured logging (pino) with timing and Discord error code awareness
- Welcome and onboarding flows triggered on member join
- Optional auto-role assignment for new members
- Per-guild configuration backed by persistent storage
- **Persistent storage** – SQLite via `better-sqlite3` for all data

### GitHub Integration
- Health/status checks
- Issue and PR lookups
- New PR announcements
- Assignee change announcements

### Engagement Features
- **Timezone support** – Save your timezone, view it later, compare users
- **Reminders** – Set, list, cancel with flexible time formats
- **AFK system** – Set AFK status with auto-reply when mentioned
- **Starboard** – Automatically highlights starred messages
- **Suggestion system** – Server members can submit and vote on ideas
- **Giveaway system** – Create and manage giveaways with automatic winner selection
- **Achievement system** – 19 unlockable achievements across 4 categories
- **Profile system** – View combined stats and progress

---

## Commands Overview

### Core Commands

| Command | Description |
|---------|-------------|
| `/help` | Command discovery and getting started guide |
| `/ping` | Health check |
| `/profile` | View your or another user's profile |
| `/achievements` | View your unlocked achievements |
| `/timezone` | Per-user timezone support |
| `/afk` | Set AFK status with auto-reply |
| `/userinfo` | View detailed info about a user |
| `/serverinfo` | View server statistics |
| `/avatar` | View user avatars |

### Games (13 total!)

| Command | Description |
|---------|-------------|
| `/fun 8ball` | Ask the magic 8-ball |
| `/fun rps` | Rock paper scissors (solo or PvP) |
| `/fun tictactoe` | Tic Tac Toe (solo or PvP) |
| `/fun trivia` | Trivia with points and streaks |
| `/fun blackjack` | Interactive blackjack |
| `/fun connect4` | PvP Connect 4 |
| `/fun hangman` | Classic word guessing |
| `/fun wordle` | Daily word puzzle |
| `/fun slots` | Slot machine with jackpots |
| `/fun would-you-rather` | Vote on WYR questions |
| `/fun coinflip` | Heads or tails |
| `/fun dice` | Custom dice rolls |
| `/fun poll` | Create polls |

### Reminders

| Command | Description |
|---------|-------------|
| `/fun remind set` | Set a reminder (5m, 1h, 1d, 1h30m) |
| `/fun remind list` | View pending reminders |
| `/fun remind cancel` | Cancel a reminder |
| `/fun remind clear` | Cancel all reminders |

### Stats & Engagement

| Command | Description |
|---------|-------------|
| `/fun daily` | Daily check-in for points |
| `/fun stats` | View all game stats |
| `/fun leaderboard` | Fun command leaderboard |
| `/fun quote` | Save/view memorable quotes |
| `/fun joke` | Community jokes |

### Giveaway System

| Command | Description |
|---------|-------------|
| `/giveaway start` | Create a giveaway |
| `/giveaway end` | End early |
| `/giveaway reroll` | Pick new winners |
| `/giveaway list` | List active giveaways |

### Server Features

| Command | Description |
|---------|-------------|
| `/starboard set` | Configure starboard |
| `/suggestion submit` | Submit an idea |
| `/config` | Server configuration |

---

## Achievement System

Unlock 19 achievements across 4 categories:

- 🎮 **Games** (9) – First Victory, Getting Good, Champion, Natural 21, Wordle Wizard, Word Nerd, Hangman Hero, Card Shark, Connect Master
- 🍀 **Luck** (4) – Jackpot!, Lucky Streak, Coin Master, High Roller
- 💪 **Dedication** (4) – Week Warrior, Month Master, Trivia Master, On Fire
- 💬 **Social** (2) – Quotable, Generous

---

## Documentation

- 🤖 [Discord Bot Setup Guide](docs/setup-discord.md)
- ⚙️ [Environment Setup](docs/setup-env.md)
- 📘 [Command Reference](docs/commands.md)
- ❓ [FAQ Storage Design](docs/faq.md)
- 🧠 [Transcript & Summary Design](docs/transcripts.md)
- 🛠️ [Development Notes](docs/dev-notes.md)

---

## Getting Started

### Requirements

- Node 18 or newer
- A Discord bot token
- A development server where you have Manage Server permissions

### Setup

> Need help creating a Discord bot and token?  
> See the [Discord Bot Setup Guide](docs/setup-discord.md).

1. Clone the repository:

```bash
git clone https://github.com/NickTheDevOpsGuy/OmegaBot.git
cd OmegaBot
```

2. Install dependencies:

```bash
npm install
```

3. Create a .env file based on the example configuration:

```bash
cp .env.example .env
# Edit .env with your bot token and other settings
```

4. Register slash commands with your development guild:

```bash
npm run register
```

5. Build and run the bot:

```bash
npm run build
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### Required Bot Permissions

Make sure your bot has these intents enabled in the Discord Developer Portal:
- **Server Members Intent** - For welcome messages and user info
- **Message Content Intent** - For starboard and AFK system

---

## Testing

OmegaBot uses **Vitest** for fast unit tests.

```bash
npm run test       # watch mode
npm run test:run   # CI mode
```

## CI

Pull requests run:

- `npm run test:run` (Vitest)
- `npm run lint` (ESLint)
- `npm run typecheck` (TypeScript)
- `npm run format:check` (Prettier)

---

## Technical Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Discord Library**: discord.js v14
- **Database**: SQLite via better-sqlite3
- **Logging**: pino
- **Code Quality**: ESLint, Prettier
- **Git Hooks**: Husky

---

## Project Structure

<details>
<summary>🗂 Click to expand file structure</summary>

```
.
├── src/
│   ├── bot.ts                    # Main entry point
│   ├── commands/
│   │   ├── achievements/         # Achievement viewing
│   │   ├── admin/                # Admin commands
│   │   ├── afk/                  # AFK system
│   │   ├── avatar/               # Avatar command
│   │   ├── config/               # Server config
│   │   ├── faq/                  # FAQ system
│   │   ├── fun/                  # All fun commands
│   │   │   └── subcommands/
│   │   │       ├── blackjack.ts
│   │   │       ├── connect4.ts
│   │   │       ├── hangman.ts
│   │   │       ├── reminders.ts
│   │   │       ├── slots.ts
│   │   │       ├── stats.ts
│   │   │       ├── wordle.ts
│   │   │       └── ...
│   │   ├── giveaway/             # Giveaway system
│   │   ├── github/               # GitHub integration
│   │   ├── help/                 # Help command
│   │   ├── profile/              # Profile command
│   │   ├── serverinfo/           # Server info
│   │   ├── starboard/            # Starboard config
│   │   ├── suggestion/           # Suggestion system
│   │   ├── timezone/             # Timezone commands
│   │   └── userinfo/             # User info
│   ├── services/
│   │   ├── database/             # SQLite database
│   │   ├── discord/              # Discord utilities
│   │   ├── github/               # GitHub API
│   │   ├── reminders/            # Reminder scheduler
│   │   ├── starboard/            # Starboard handler
│   │   └── ...
│   └── utils/
├── docs/                         # Documentation
├── data/                         # SQLite database files
└── package.json
```

</details>

---

## Extending OmegaBot

OmegaBot is designed for small, focused modules. To add new features:

1. Create a new command file under `src/commands/<category>/`
2. Add any logic needed inside `src/services/<feature>/`
3. Run `npm run register` to publish new slash commands

---

## Contributors

Thanks to everyone who has helped build or improve OmegaBot.

<a href="https://contrib.rocks/image?repo=NickTheDevOpsGuy/OmegaBot">
  <img src="https://contrib.rocks/image?repo=NickTheDevOpsGuy/OmegaBot" alt="Contributors">
</a>

To learn how to contribute, read the [CONTRIBUTOR.md](CONTRIBUTOR.md) file.

---

## License

MIT License. Use and modify freely.
