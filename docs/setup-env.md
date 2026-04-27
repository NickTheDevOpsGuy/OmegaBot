# Environment Configuration

OmegaBot uses `.env` for required credentials, optional feature flags, and runtime settings.

This page is the config reference. For feature-specific walkthroughs, use the dedicated setup pages such as [Notion Wiki Setup](setup-notion.md).

---

## Table of Contents

- [Quick Start](#quick-start)
- [Required Variables](#required-variables)
- [Core Runtime Options](#core-runtime-options)
- [Optional Features](#optional-features)
- [Notes On Missing Config](#notes-on-missing-config)

---

## Quick Start

Create a local env file from the example:

```bash
cp .env.example .env
```

Then fill in at least the required Discord values before starting the bot.

Important:

- do not commit `.env`
- treat `.env` values as secrets unless they are clearly non-sensitive
- restart the bot after changing runtime config

---

## Required Variables

These are required for OmegaBot to start normally:

```env
DISCORD_TOKEN=your-bot-token
DISCORD_APP_ID=your-application-id
DISCORD_GUILD_ID=your-guild-id
```

- `DISCORD_TOKEN` - bot token from the Discord Developer Portal
- `DISCORD_APP_ID` - application ID used for command registration
- `DISCORD_GUILD_ID` - guild ID used for scoped command registration

Without these, the bot cannot fully boot or register slash commands correctly.

---

## Core Runtime Options

### Database (SQLite)

OmegaBot uses SQLite via `better-sqlite3`.

```env
DATABASE_PATH=data/omegabot.db
```

- default: `data/omegabot.db`
- use `:memory:` in tests when you want an in-memory database

### Metrics And Health HTTP Server

```env
METRICS_PORT=0
```

- `METRICS_PORT`
  - enables `/health` and `/metrics` when set to a non-zero value
  - example: `9090`
- `ADMIN_DASHBOARD_TOKEN`
  - optional token for `/dashboard` and `/`
  - useful when exposing the metrics/dashboard port outside localhost

If `METRICS_PORT` is unset or `0`, the HTTP monitoring server stays disabled.

### Reminders

```env
REMINDER_TIMING_LOGS=0
```

- set to `1` to emit extra debug timing logs for the reminder scheduler

### Web API

When running the optional API with `npm run api`, these values apply:

```env
WEB_API_PORT=4000
```

- `WEB_API_PORT` - HTTP port for the API server
- `WEB_API_KEY` - optional API key for authenticated write endpoints
- `DISCORD_OAUTH_CLIENT_ID` - required for Discord OAuth login on the web side
- `DISCORD_OAUTH_CLIENT_SECRET` - required for the OAuth callback exchange
- `DISCORD_OAUTH_REDIRECT_URI` - optional explicit callback URL override
- `WEB_APP_URL` - optional post-login redirect target
- `CORS_ORIGIN` - optional CORS allow-origin value

See [Web platform](web-platform.md) for the full web/API flow.

---

## Optional Features

If optional config is missing, OmegaBot should disable that feature cleanly rather than crash.

### Summaries (LLM-powered)

```env
SUMMARY_MODE=local
OPENAI_API_KEY=your-openai-key
```

- `SUMMARY_MODE`
  - `local` for heuristic/local summaries
  - `llm` for OpenAI-backed summaries
- `OPENAI_API_KEY`
  - required when `SUMMARY_MODE=llm`

### Weather (WeatherAPI.com)

```env
WEATHERAPI_KEY=your-weatherapi-key
```

- required for weather commands
- if missing, weather commands return a friendly error instead of crashing the bot

Get a key from `https://www.weatherapi.com/`.

### GitHub Integration

```env
GITHUB_TOKEN=your-github-pat
GITHUB_OWNER=org-or-user
GITHUB_REPO=repo-name
```

Recommended token permissions:

- Contents: Read
- Issues: Read
- Pull Requests: Read

### GitHub Announcement Channels

```env
GITHUB_ANNOUNCE_CHANNEL_ID=channel-id
GITHUB_PR_ANNOUNCE_CHANNEL_ID=channel-id
GITHUB_ASSIGNEE_ANNOUNCE_CHANNEL_ID=channel-id
```

If these channels are not configured, GitHub announcement features stay disabled.

### Jokes Discord Role

```env
JOKE_MODERATOR_ROLE_ID=
```

Recommended setup:

1. create a role such as `Joke Moderator`
2. assign it to trusted members
3. paste the role ID into `.env`

### Hangman Word Management

```env
HANGMAN_ADMIN_ROLE_ID=
```

Users with this role can add and list Hangman words via `/fun hangman words add` and `/fun hangman words list`.

If unset, only the built-in word list is available.

### Admin / Moderation

```env
ADMIN_USER_IDS=123456789012345678,987654321098765432
MODERATION_ALLOWED_ROLE_IDS=111111111111111111
```

- `ADMIN_USER_IDS`
  - comma-separated Discord user IDs
  - allows those users to run `/admin` moderation commands even without moderator roles
- `MODERATION_ALLOWED_ROLE_IDS`
  - optional comma-separated role IDs
  - when set, these roles become the stricter allowlist for timeout/kick/ban actions

If `MODERATION_ALLOWED_ROLE_IDS` is unset, normal moderator access rules apply instead.

See [FAQ for Server Admins](faq-admins.md#who-can-use-admin) for the behavior breakdown.

### Bot Admin / Knowledge Base Admin

```env
BOT_ADMIN_ROLE_IDS=111111111111111111,222222222222222222
BOT_ADMIN_AUDIT_CHANNEL_ID=333333333333333333
```

- `BOT_ADMIN_ROLE_IDS`
  - comma-separated role IDs for broader documentation/knowledge-base admin access
  - applies to actions like `/faq add`, `/faq remove`, `/notion status`, `/notion templates`, `/notion create-page`, and `/notion add`
- `BOT_ADMIN_AUDIT_CHANNEL_ID`
  - optional audit channel for lightweight admin/audit messages

This lets you delegate docs and Notion maintenance without handing out full moderation powers.

### Notion Wiki Integration

```env
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=0123456789abcdef0123456789abcdef
NOTION_INVITE_URL=https://www.notion.so/your-workspace/Your-Wiki-Page-Id?source=copy_link
```

- `NOTION_TOKEN`
  - internal Notion integration token
- `NOTION_DATABASE_ID`
  - the specific database OmegaBot should search and write to
- `NOTION_INVITE_URL`
  - optional share/invite URL to show in welcome or onboarding messages
  - intended for users; not used by the Notion API client for search/create

Notion-related commands enabled by this setup:

- `/wiki`
- `/notion search`
- `/notion status`
- `/notion templates`
- `/notion create-page`
- `/notion add`

Use [Notion Wiki Setup](setup-notion.md) for the full workflow, including the critical "share the database with the integration" step.

### Discord Privileged Intents

```env
DISCORD_ENABLE_GUILD_MEMBERS_INTENT=false
DISCORD_ENABLE_MESSAGE_CONTENT_INTENT=false
```

- `DISCORD_ENABLE_GUILD_MEMBERS_INTENT`
  - required for member-join flows like auto-role and welcome logic
- `DISCORD_ENABLE_MESSAGE_CONTENT_INTENT`
  - required for DM and `@mention` chat behavior

If you set either to `true` in `.env`, you must also enable the same intent in the Discord Developer Portal.

OmegaBot still always requests its normal non-privileged core intents in code.

---

## Notes On Missing Config

OmegaBot is designed to fail fast for required config and degrade gracefully for optional config.

That means:

- required Discord config should stop startup quickly
- optional features like weather, GitHub, Notion, or LLM-backed summaries should log clear status and disable themselves cleanly when not configured

When in doubt, check startup logs and the relevant feature setup page.
