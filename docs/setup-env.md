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

### Reminders

```env
# Optional. Enable extra scheduler timing logs (debug-level)
REMINDER_TIMING_LOGS=0
```

- `REMINDER_TIMING_LOGS`
  - Set to `1` to enable debug timing logs for the reminder scheduler tick

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
