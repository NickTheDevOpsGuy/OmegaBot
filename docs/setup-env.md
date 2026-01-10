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

# Legacy (fallback) channel:
# If set, it will be used as the default for GitHub announcements
# unless a more specific channel is provided below.
GITHUB_ANNOUNCE_CHANNEL_ID=channel-id

# Assignee + closure activity channel:
# Used for:
# - Assignee added / removed
# - Self-assignment / unassignment
# - Issue / PR closed events
#
# If unset, falls back to GITHUB_ANNOUNCE_CHANNEL_ID.
# If neither is set, assignee polling is disabled.
GITHUB_ASSIGNEE_ANNOUNCE_CHANNEL_ID=

# Polling interval (milliseconds)
GITHUB_POLL_INTERVAL_MS=60000
```

Minimum GitHub PAT permissions:

- Contents: Read
- Issues: Read
- Pull Requests: Read
