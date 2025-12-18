# Environment Configuration

OmegaBot uses environment variables for configuration.

## Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

## Required Variables

```env
DISCORD_TOKEN=your-bot-token
DISCORD_APP_ID=your-application-id
DISCORD_GUILD_ID=your-guild-id
```

## Optional Features

### Summaries

```env
SUMMARY_MODE=local
OPENAI_API_KEY=your-key
```

### GitHub Integration

```env
GITHUB_TOKEN=your-github-pat
GITHUB_OWNER=org-or-user
GITHUB_REPO=repo-name
GITHUB_ANNOUNCE_CHANNEL_ID=channel-id
GITHUB_POLL_INTERVAL_MS=60000
```

Minimum GitHub PAT permissions:

- Contents: Read
- Issues: Read
- Pull Requests: Read
