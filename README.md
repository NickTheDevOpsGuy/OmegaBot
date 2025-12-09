<p align="center">
  <img src="assets/banner.png" alt="OmegaBot Banner" width="900">
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/NickTheDevOpsGuy/OmegaBot">
  <img src="https://img.shields.io/github/license/NickTheDevOpsGuy/OmegaBot">
  <img src="https://img.shields.io/badge/node-18+-blue">
  <img src="https://img.shields.io/badge/made%20with-JavaScript-yellow">
</p>

# OmegaBot

OmegaBot is a modular Discord bot designed to support development projects with quick summaries, FAQs, GitHub lookups, and automated notifications. The structure is clean and fully service based which makes it easy to extend.

## Features

Current features:
- Slash command system
- Ping command for testing
- Summary command with local summary mode
- Automatic command loading
- Simple and readable project structure

Planned features:
- FAQ storage and quick lookup
- GitHub issues and pull request lookups
- Pull request announcements
- Better summary analysis
- Optional LLM powered summaries

## Getting Started

### Requirements
- Node 18 or newer
- A Discord bot token
- A development server where you have Manage Server permissions

### Setup

Clone the repo:

```bash
git clone https://github.com/NickTheDevOpsGuy/OmegaBot.git
cd OmegaBot
```

Install dependencies:

```bash
npm install
```

Create a `.env` file based on `.env.example`:

```
DISCORD_TOKEN=your_token_here
DISCORD_APP_ID=your_application_id
DISCORD_GUILD_ID=your_guild_id
SUMMARY_MODE=local
```

### Register Slash Commands

```bash
npm run register
```

### Run the Bot

```bash
npm run dev
```

You should see:

```
OmegaBot is online
```

## Project Structure

```
.
├── .github
│   ├── ISSUE_TEMPLATE
│   │   ├── bug.yml
│   │   ├── config.yml
│   │   ├── documentation.yml
│   │   ├── enhancement_refactor.yml
│   │   ├── feature_request.yml
│   │   └── question_discussion.yml
│   ├── pull_request_template.md
│   └── workflows
│       └── FollowTheFlow.yml
├── .gitignore
├── .husky
│   ├── pre-commit
│   └── pre-push
├── assets
│   ├── banner.png
│   └── omegabot.png
├── CONTRIBUTORS.md
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── scripts
│   └── precheck.sh
└── src
    ├── bot.js
    ├── commands
    │   ├── general
    │   │   └── ping.js
    │   └── summary
    │       └── summary.js
    ├── config
    │   └── env.js
    ├── registerCommands.js
    └── services
        ├── discord
        │   ├── commandLoader.js
        │   └── interactionHandler.js
        └── summary
            ├── llmSummary.js
            ├── localSummary.js
            └── summarizer.js
```
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

Generated using https://contrib.rocks

To learn how to contribute, read the [CONTRIBUTOR.md](CONTRIBUTOR.md) file.

If you would like to contribute, please open an issue or submit a pull request.

---

## License

MIT License. Use and modify freely.
