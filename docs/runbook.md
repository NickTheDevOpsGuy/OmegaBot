# Runbook

Short guide for running and maintaining OmegaBot.

---

## Deploy / Start

1. Clone (or pull), then: `npm ci && npm run build && npm run register && npm start`
2. Or after code changes: `npm run build && npm start` (re-register only if you changed slash command definitions).

---

## Restart

- Stop the process (Ctrl+C or your process manager).
- Start again: `npm start` (or `node dist/bot.js`). State is in SQLite; no special shutdown needed.

---

## Database

- **Path**: By default `data/omegabot.db` (override with `DATABASE_PATH` in `.env`).
- **Backup**: Copy the file while the bot is running (SQLite handles concurrent read). Example: `cp data/omegabot.db data/omegabot.db.bak-$(date +%Y%m%d)`.
- **Integrity**: Run `npm run db:check` to verify SQLite health.

---

## Health

- In Discord: `/admin health` (Manage Server) shows DB status, env summary, and interaction error counts.
- Logs: Set `LOG_LEVEL=debug` for more detail; `info` is default.

---

## Security

- **Secrets**: Never log `DISCORD_TOKEN`, API keys, or other secrets. Keep them only in `.env` (not committed).

---

## Common Issues

- **“Interaction failed”** – See [Troubleshooting](troubleshooting.md).
- **Missing features** – Check `.env` and [Environment Setup](setup-env.md); optional features disable cleanly if not configured.
- **Rate limits** – Cooldowns are per-user; see [Command Reference](commands.md) for limits.

---

## Optional: Pre-push Checks

- `git push` runs `precheck` (Prettier, ESLint, TypeScript). To skip: put `[skip-precheck]` in the last commit message.
- To run tests before push, add `npm run test:run` to `scripts/precheck.sh`.
