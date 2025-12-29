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

## Features

Current features

- Modular slash-command system (auto-loaded from dist/commands)
- /ping command for testing
- /summary command (local + LLM mode)
- /history command (DM + file fallback)
- /playback command (button pagination)
- /pagination command (inline paging)
- /timezone command (per-user IANA timezone)
- /changelog command (ephemeral preview)
- /fun commands: chucknorris, dadjoke, coinflip, dice, weather
- Centralized structured logging

Planned features

- FAQ storage and quick lookup
- GitHub issues and pull request lookups
- Pull request announcements
- Pagination for large history/playback (buttons or follow-ups)
- Per-user timezone support (store IANA timezone and apply to transcripts)
- Improved summary output (highlights, action items, structured sections)

---

## Documentation

- 🤖 [Discord Bot Setup Guide](docs/discord-bot-setup.md)
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
> See the [Discord Bot Setup Guide](docs/discord-bot-setup.md).

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

- [.env.example](.env.example)

4. Register slash commands with your development guild:

```bash
npm run register
```

5. Run the bot locally:

```bash
npm run dev
```

You should see:

```
OmegaBot is online
```

---

## Project Structure

<details>
<summary>📁 Click to expand file structure</summary>

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
│   ├── faqs.json
│   ├── last-seen.json
│   └── timezones.json
├── docs
│   ├── commands.md
│   ├── dev-notes.md
│   ├── faq.md
│   ├── setup-discord.md
│   ├── setup-env.md
│   └── transcripts.md
├── scripts
│   └── precheck.sh
├── src
│   ├── commands
│   │   ├── changelog
│   │   │   └── changelog.ts
│   │   ├── faq
│   │   │   ├── subcommands
│   │   │   │   ├── _shared.ts
│   │   │   │   ├── add.ts
│   │   │   │   ├── get.ts
│   │   │   │   ├── list.ts
│   │   │   │   └── remove.ts
│   │   │   ├── faq.ts
│   │   │   ├── services.ts
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   ├── fun
│   │   │   ├── subcommands
│   │   │   │   ├── chucknorris.ts
│   │   │   │   ├── coinflip.ts
│   │   │   │   ├── dadjoke.ts
│   │   │   │   ├── dice.ts
│   │   │   │   └── weather.ts
│   │   │   └── fun.ts
│   │   ├── general
│   │   │   └── ping.ts
│   │   ├── github
│   │   │   ├── gh.ts
│   │   │   └── pr.ts
│   │   ├── history
│   │   │   └── history.ts
│   │   ├── pagination
│   │   │   └── pagination.ts
│   │   ├── playback
│   │   │   └── playback.ts
│   │   └── summary
│   │       └── summary.ts
│   ├── config
│   │   └── env.ts
│   ├── services
│   │   ├── discord
│   │   │   ├── commandLoader.ts
│   │   │   ├── fetchChannelMessages.ts
│   │   │   └── interactionHandler.ts
│   │   ├── faq
│   │   │   ├── faqService.ts
│   │   │   ├── permissions.ts
│   │   │   ├── services.test.ts
│   │   │   ├── services.ts
│   │   │   ├── store.test.ts
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   ├── github
│   │   │   ├── githubApi.ts
│   │   │   ├── githubClient.ts
│   │   │   ├── lastSeenStore.ts
│   │   │   ├── prFormatter.ts
│   │   │   ├── prPoller.ts
│   │   │   └── types.ts
│   │   ├── summary
│   │   │   ├── llmSummary.ts
│   │   │   ├── localSummary.ts
│   │   │   └── summarizer.ts
│   │   ├── time
│   │   │   ├── formatTimestamp.ts
│   │   │   └── validateTimezone.ts
│   │   ├── timezone
│   │   │   ├── timezone.ts
│   │   │   └── timezoneStore.ts
│   │   ├── transcript
│   │   │   ├── buildTranscript.ts
│   │   │   └── defaults.ts
│   │   └── weather
│   │       ├── forecast.ts
│   │       ├── geocode.ts
│   │       └── types.ts
│   ├── utils
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
