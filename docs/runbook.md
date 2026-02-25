# Runbook

Short guide for running and maintaining OmegaBot.

---

## Deploy / Start

1. **Node**: Clone (or pull), then: `npm ci && npm run build && npm run register && npm start`
2. **Docker**: See [Docker](#docker) below.
3. Or after code changes: `npm run build && npm start` (re-register only if you changed slash command definitions).

**Note:** `npm run register` requires `DISCORD_TOKEN` and `DISCORD_APP_ID` in `.env` (or your environment). If these are not set, registration will fail. See [Environment Setup](setup-env.md).

---

## Docker

```bash
cp .env.example .env
# Edit .env: add DISCORD_TOKEN, DISCORD_APP_ID, DISCORD_GUILD_ID
docker compose up -d
```

- Data persists in the `omegabot_data` volume.
- Metrics/health exposed on port 9090 (override with `METRICS_PORT` in `.env`).
- Logs: `docker compose logs -f bot`

---

## Restart

- Stop the process (Ctrl+C or your process manager). The bot performs graceful shutdown (closes Discord, then DB).
- Start again: `npm start` (or `node dist/bot.js`). State is in SQLite.

---

## Database

- **Path**: By default `data/omegabot.db` (override with `DATABASE_PATH` in `.env`).
- **Backup**: Run `npm run db:backup` (or `scripts/backup-db.sh`). Backups go to `data/backups/` by default; set `BACKUP_KEEP` to limit retained backups (default 7). SQLite handles concurrent read—safe to run while bot is up. When `sqlite3` is installed, runs `PRAGMA integrity_check` on the backup and fails if corrupt.
- **Integrity**: Run `npm run db:check` to verify SQLite health.
- **Migrations**: Schema changes go in `migrations/*.sql`; run automatically on startup.

---

## Health

- **Discord**: `/admin health` (Manage Server) shows DB status, env summary, and interaction error counts.
- **HTTP**: Set `METRICS_PORT=9090` (or another port) to enable:
  - `GET /` or `GET /dashboard` – Web admin UI (health, DB, Discord, uptime). If `ADMIN_DASHBOARD_TOKEN` is set, require `?token=<token>`.
  - `GET /health` – JSON with status, database, discord, uptime (200 if all ok, 503 if degraded).
  - `GET /metrics` – Prometheus scrape endpoint.
- **Logs**: Set `LOG_LEVEL=debug` for more detail; `info` is default.

---

## Security

- **Secrets**: Never log `DISCORD_TOKEN`, API keys, or other secrets. Keep them only in `.env` (not committed).

---

## Common Issues

- **“Interaction failed”** – See [Troubleshooting](troubleshooting.md).
- **Missing features** – Check `.env` and [Environment Setup](setup-env.md); optional features disable cleanly if not configured.
- **Rate limits** – Cooldowns are per-user; see [Command Reference](commands.md) for limits.

---

## E2E Tests

Run `npm run test:e2e` to start the bot and verify it connects to Discord. Requires `DISCORD_TOKEN` and `DISCORD_APP_ID` in `.env`. Uses in-memory DB. The script starts the bot, waits for "ready", then shuts down.

In CI (GitHub Actions), the e2e job runs only when `DISCORD_TOKEN` and `DISCORD_APP_ID` are set as repository secrets.

---

## Optional: Pre-push Checks

- `git push` runs `precheck` (Prettier, ESLint, TypeScript, tests). To skip: put `[skip-precheck]` in the last commit message.
