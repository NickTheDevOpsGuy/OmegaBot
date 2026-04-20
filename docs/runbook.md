# Runbook

This is the operator-facing guide for starting, restarting, monitoring, and backing up OmegaBot.

Use this page for recurring maintenance tasks. Use [Troubleshooting](troubleshooting.md) for failure diagnosis and [Environment Configuration](setup-env.md) for config details.

---

## Table of Contents

- [Start And Deploy](#start-and-deploy)
- [Docker](#docker)
- [Restart](#restart)
- [Database](#database)
- [Health And Monitoring](#health-and-monitoring)
- [Security](#security)
- [Common Issues](#common-issues)
- [E2E Tests](#e2e-tests)
- [Optional Quality Checks](#optional-quality-checks)

---

## Start And Deploy

### Local or VM Process

For a fresh setup or after pulling changes:

```bash
npm ci
npm run build
npm run register
npm start
```

Use `npm run register` when slash command definitions changed or when you are setting up the bot in a new guild.

If you only changed normal runtime code, this is usually enough:

```bash
npm run build
npm start
```

`npm run register` needs `DISCORD_TOKEN` and `DISCORD_APP_ID` to be configured first. See [Environment Configuration](setup-env.md).

### Optional Web API

To run the optional HTTP API for profiles, leaderboards, events, posts, and auth:

```bash
npm run api
```

or:

```bash
node dist/web/server.js
```

This API uses the same database as the bot. See [Web platform](web-platform.md) for details.

---

## Docker

Basic Docker startup:

```bash
cp .env.example .env
# Edit .env and set DISCORD_TOKEN, DISCORD_APP_ID, DISCORD_GUILD_ID
docker compose up -d
```

Notes:

- data persists in the `omegabot_data` volume
- logs can be tailed with `docker compose logs -f bot`
- health and metrics are exposed when `METRICS_PORT` is enabled in `.env`

---

## Restart

When restarting the bot:

1. Stop the process or container.
2. Let it shut down cleanly so Discord and SQLite are closed properly.
3. Start it again with your normal runtime command or process manager.

Examples:

```bash
npm start
```

or:

```bash
node dist/bot.js
```

State is persisted in SQLite, so a normal restart should not lose bot data.

---

## Database

### Default Location

- default path: `data/omegabot.db`
- override with `DATABASE_PATH` in `.env`

### Backup

Create a backup with:

```bash
npm run db:backup
```

or:

```bash
scripts/backup-db.sh
```

Behavior:

- backups go to `data/backups/` by default
- `BACKUP_KEEP` controls how many backups are retained
- the script is safe to run while the bot is up because SQLite supports concurrent reads
- if `sqlite3` is installed, the backup script also runs an integrity check

### Integrity Check

Run:

```bash
npm run db:check
```

Use this when you suspect corruption, migration drift, or startup issues tied to SQLite.

### Migrations

Schema changes live in `migrations/*.sql` and are applied automatically on startup.

---

## Health And Monitoring

### Discord-Side Health

Use:

```text
/admin health
```

This gives admins a quick summary of:

- database health
- environment/config summary
- interaction error counts
- optional external integration reachability

### HTTP Monitoring Endpoints

If you set `METRICS_PORT`, OmegaBot exposes:

- `GET /` or `GET /dashboard` - lightweight admin dashboard
- `GET /health` - JSON health summary
- `GET /metrics` - Prometheus scrape endpoint

If `ADMIN_DASHBOARD_TOKEN` is set, `/` and `/dashboard` require `?token=<value>`.

### Logs

- default runtime logging is `info`
- use `LOG_LEVEL=debug` temporarily when diagnosing issues

---

## Security

- never commit `.env`
- never log secrets such as Discord tokens or API keys
- protect `ADMIN_DASHBOARD_TOKEN` if you expose monitoring endpoints publicly
- prefer least-privilege config for optional integrations and admin roles

---

## Common Issues

- "Interaction failed" - see [Troubleshooting](troubleshooting.md)
- missing optional features - check `.env` and [Environment Configuration](setup-env.md)
- rate limit confusion - see [Command Reference](commands.md)

---

## E2E Tests

Run:

```bash
npm run test:e2e
```

This starts the bot, waits for Discord ready, and shuts it down again.

Requirements:

- `DISCORD_TOKEN`
- `DISCORD_APP_ID`

The E2E flow uses an in-memory DB and is mainly intended as a connectivity smoke test.

---

## Optional Quality Checks

### Coverage

Run:

```bash
npm run test:coverage
```

### Pre-Push Checks

The repo's `precheck` flow covers formatting, linting, TypeScript, and tests.

- normal `git push` runs pre-push checks
- `[skip-precheck]` in the most recent commit message skips that hook when you intentionally need to bypass it
