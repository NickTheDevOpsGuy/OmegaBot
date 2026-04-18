# Environment Configuration

OmegaBot uses environment variables for configuration.
All configuration is done via a `.env` file that is **not committed to source control**.

---

### Database (SQLite)

OmegaBot uses SQLite via `better-sqlite3`.

```env
# Optional. Defaults to data/omegabot.db
DATABASE_PATH=data/omegabot.db
```

- `DATABASE_PATH`
  - Path to the SQLite database file
  - Use `:memory:` in tests to run entirely in-memory

---

### Metrics & Health HTTP Server

```env
METRICS_PORT=0
```

- `METRICS_PORT`
  - Port for `/health` and `/metrics` (Prometheus) HTTP endpoints
  - If `0` or unset, the HTTP server is disabled
  - Example: `METRICS_PORT=9090` to enable monitoring
- `ADMIN_DASHBOARD_TOKEN`
  - If set, `/dashboard` and `/` require `?token=<value>` (use when exposing metrics port publicly)
  - If unset, dashboard is open (fine for localhost)

---

### Reminders

```env
# Optional. Enable extra scheduler timing logs (debug-level)
REMINDER_TIMING_LOGS=0
```

- `REMINDER_TIMING_LOGS`
  - Set to `1` to enable debug timing logs for the reminder scheduler tick

---

### Web API (optional)

When running the optional Web API (`npm run api`), the same database is used. See [Web platform](web-platform.md) for full setup.

```env
# Optional. Defaults to 4000
WEB_API_PORT=4000
```

- `WEB_API_PORT`
  - Port for the HTTP API server (profiles, leaderboards, events, games)
  - Only used when you start the API with `npm run api`
- `WEB_API_KEY`
  - Optional. If set, clients can send `X-API-Key: <value>` to authenticate for write endpoints (e.g. POST /api/posts). For writes with API key, include `userId` in the request body where required.
- `DISCORD_OAUTH_CLIENT_ID`
  - Optional. Discord OAuth Application ID for web login. Required for `/auth/discord` and `/auth/discord/callback`.
- `DISCORD_OAUTH_CLIENT_SECRET`
  - Optional. Discord OAuth client secret. Required for the callback to exchange the code for a token.
- `DISCORD_OAUTH_REDIRECT_URI`
  - Optional. Override redirect URI (e.g. `https://yoursite.com/auth/discord/callback`). If unset, the server builds it from the request host.
- `WEB_APP_URL`
  - Optional. Where to redirect after Discord OAuth login (default `/`).
- `CORS_ORIGIN`
  - Optional. Value for `Access-Control-Allow-Origin` (default `*`). Set to your frontend origin (e.g. `https://yoursite.com`) in production.

## Setup

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

⚠️ Never commit `.env` files. They contain secrets.

---

## Required Variables

These are required for **OmegaBot to start and function**.

```env
DISCORD_TOKEN=your-bot-token
DISCORD_APP_ID=your-application-id
DISCORD_GUILD_ID=your-guild-id
```

- `DISCORD_TOKEN` – Bot token from the Discord Developer Portal
- `DISCORD_APP_ID` – Application ID for slash command registration
- `DISCORD_GUILD_ID` – Guild ID used for scoped command registration

---

## Optional Features

If a feature is not configured, OmegaBot will **log a warning and gracefully disable it**.

---

### Summaries (LLM-powered)

```env
SUMMARY_MODE=local
OPENAI_API_KEY=your-openai-key
```

- `SUMMARY_MODE`
  - `local` – No LLM, simple local summaries
  - `llm` – Uses OpenAI for higher-quality summaries
- `OPENAI_API_KEY`
  - Required only if `SUMMARY_MODE=llm`
  - Missing keys fall back to local summaries

---

### Weather (WeatherAPI.com)

OmegaBot uses **WeatherAPI.com** for current conditions and multi-day forecasts.

```env
WEATHERAPI_KEY=your-weatherapi-key
```

- Required for `/weather` and `/weather7`
- If missing or invalid:
  - Bot still starts normally
  - Weather commands return a friendly error
  - A warning is logged at startup

Get a free API key here:
https://www.weatherapi.com/

---

### GitHub Integration

```env
GITHUB_TOKEN=your-github-pat
GITHUB_OWNER=org-or-user
GITHUB_REPO=repo-name
```

Recommended permissions:

- Contents: Read
- Issues: Read
- Pull Requests: Read

---

### GitHub Announcement Channels (Optional)

```env
GITHUB_ANNOUNCE_CHANNEL_ID=channel-id
GITHUB_PR_ANNOUNCE_CHANNEL_ID=channel-id
GITHUB_ASSIGNEE_ANNOUNCE_CHANNEL_ID=channel-id
```

If no channels are configured, GitHub announcements are disabled.

### Jokes Discord Role (Optional)

Recommended setup:

1. Create a "Joke Moderator" role in your Discord server
2. Assign it to trusted members
3. Add the role ID here

```env
JOKE_MODERATOR_ROLE_ID=
```

### Hangman Word Management (Optional)

Users with this role can add and list Hangman words via `/fun hangman words add` and `/fun hangman words list`.

1. Create a role (e.g. "Hangman Admin") in your Discord server
2. Assign it to trusted members
3. Add the role ID here

```env
HANGMAN_ADMIN_ROLE_ID=
```

If unset, only the built-in word list is used and no one can add words.

---

### Admin / Moderation (Optional)

Control who can use `/admin` (timeout, kick, ban) via **user IDs** in `.env`:

```env
ADMIN_USER_IDS=123456789012345678,987654321098765432
```

- **Format:** Comma-separated Discord user IDs (no spaces required).
- **Get your user ID:** Enable Developer Mode in Discord → Right-click your username → Copy ID.
- Users listed here can run `/admin` moderation subcommands even without Discord Administrator or moderator roles.
- If unset or empty, only **role-based** access applies: Discord Administrator, Manage Server, Moderate Members, or roles added with `/config moderator-role`.

**Restrict moderation to a specific role (optional):**

```env
MODERATION_ALLOWED_ROLE_IDS=111111111111111111
```

- **Format:** Comma-separated Discord **role** IDs.
- **If set:** Only users with one of these roles (or in `ADMIN_USER_IDS`) can use `/admin timeout`, `/admin kick`, and `/admin ban`. Stats and health still use the normal moderator check.
- **If unset:** Normal rules above apply (Administrator, Manage Server, Moderate Members, `/config moderator-role`).
- **Get role ID:** Server Settings → Roles → Right-click role → Copy ID.

See [FAQ – Who can use /admin?](faq-admins.md#who-can-use-admin) for details.

### Bot Admin / Knowledge Base Admin (Optional)

Use these when you want a broader admin group for documentation curation and Notion management without giving full moderator powers to everyone.

```env
BOT_ADMIN_ROLE_IDS=111111111111111111,222222222222222222
BOT_ADMIN_AUDIT_CHANNEL_ID=333333333333333333
```

- `BOT_ADMIN_ROLE_IDS`
  - Comma-separated Discord role IDs
  - Grants access to:
    - `/faq add`
    - `/faq remove`
    - `/notion status`
    - `/notion create-page`
  - `ADMIN_USER_IDS` still works too, and Discord Administrator / Manage Server also count
- `BOT_ADMIN_AUDIT_CHANNEL_ID`
  - Optional channel ID for lightweight audit messages when docs are curated or Notion pages are created

### Notion Wiki Integration (Optional)

OmegaBot can search a Notion wiki database and create new pages from Discord.

```env
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=0123456789abcdef0123456789abcdef
```

- `NOTION_TOKEN`
  - Internal integration token from Notion
  - Create it under [Notion integrations](https://www.notion.so/my-integrations)
- `NOTION_DATABASE_ID`
  - The database the bot should search and create pages in
  - Share that database with the integration inside Notion or requests will fail

Commands enabled by this setup:

- `/wiki` – search curated FAQ docs and optional Notion pages together
- `/notion search` – search the Notion wiki directly
- `/notion status` – validate config and show detected database schema
- `/notion create-page` – create a new page in the configured database

See [Notion Wiki Setup](setup-notion.md) for the full step-by-step flow.
