# Troubleshooting

Common issues and how to debug them.

---

## Table of Contents

- ["Failed to complete" on Slash Commands](#failed-to-complete-on-slash-commands)
- [HTTP Health Endpoint](#http-health-endpoint)
- [Database Issues](#database-issues)
- [User-facing errors](#user-facing-errors)
- [Log Levels](#log-levels)

---

## "Failed to complete" on Slash Commands

When users see "This interaction failed" or "Application did not respond" in Discord, the bot did not acknowledge the interaction within Discord's 3-second window, or the interaction expired before the bot could respond.

### Why it happens

1. **Interaction expired (10062)** – User took too long, or the bot was slow to respond.
2. **Unknown message (10008)** – User dismissed an ephemeral message before the bot could edit it, or the message was deleted.
3. **Already acknowledged (40060)** – The bot tried to reply twice (e.g. `reply()` after `deferUpdate()`).

### How we handle it

- All slash commands defer immediately (`deferReply`) before doing work.
- Button interactions use `deferUpdate()` or `update()` before any async work.
- Known errors (10008, 10062, 40060) are caught and logged at INFO level.

### Debugging

1. **Check logs** – Set `LOG_LEVEL=info` (default) or `LOG_LEVEL=debug`. Look for:

   ```
   [interaction] Discord error (user may see 'failed to complete'): unknown_interaction
   ```

   When we recover (e.g. collector/button errors, or when `safeReply` falls back to `followUp` after a failed reply), logs include `interactionFailedRecovery: true`. Use this to filter or alert on interaction issues:

   ```bash
   grep "interactionFailedRecovery" /path/to/logs
   ```

2. **Admin health** – Run `/admin health` to see interaction error counts since startup. Elevated counts suggest network or latency issues.

3. **Unhandled rejections** – If failures still occur with no logs, an unhandled promise rejection may be escaping. Check for:

   ```
   [unhandledRejection] Discord interaction error
   ```

   or

   ```
   [unhandledRejection] uncaught promise rejection
   ```

4. **Temporary debug** – Set `LOG_LEVEL=debug` to see interaction timing and more context. Revert to `info` when done to reduce log volume.

---

## HTTP Health Endpoint

If you set `METRICS_PORT` (e.g. 9090), the bot exposes:

- **`GET /health`** – Returns 200 when database is ok, 503 when degraded. JSON body includes `status`, `database`, `uptime_seconds`.
- **`GET /metrics`** – Prometheus scrape endpoint.

Use these for load balancer health checks, Kubernetes probes, or monitoring dashboards.

---

## Database Issues

### SQLite busy / locked

- Ensure only one bot instance uses the database file.
- Check for long-running transactions or blocking queries.

### Schema mismatches

- Run `npm run db:check` to verify integrity.
- Check `migrations/` for schema changes. Migrations run automatically on startup.

### `better-sqlite3` native module / Node ABI mismatch

If tests or startup fail with a message like:

```text
was compiled against a different Node.js version using NODE_MODULE_VERSION ...
```

your installed `better-sqlite3` binary was built for a different Node version than the one you're running now.

What to do:

1. Use the repo's recommended runtime:

   ```bash
   nvm use
   ```

   `.nvmrc` currently points to **Node 20**.

2. Rebuild the native module:

   ```bash
   npm rebuild better-sqlite3
   ```

3. If that still fails, reinstall dependencies under the correct Node version:

   ```bash
   rm -rf node_modules
   npm install
   ```

This usually affects local testing more than bot logic, but it will block DB-backed tests until the native module matches your runtime.

---

## User-facing errors

Error messages shown in Discord are kept **non-technical**: no `.env` variable names, API key names, or stack traces. Users see short, actionable text (e.g. “Something went wrong. Please try again.” or “Ask a server admin to set up the weather API.”). Admins can use `/admin health`, logs, and [Environment Setup](setup-env.md) to diagnose configuration issues.

**For developers:** Use `getUserFacingReason(err)` when replying on error; use `getContextLogger()` in command catch blocks so logs include `requestId`. See [Development Notes → User-facing errors and logging](dev-notes.md) for `errorReply`, inline `EmbedBuilder` guidance, and full policy.

---

## Log Levels

| Level   | Use case                             |
| ------- | ------------------------------------ |
| `error` | Production, minimal logs             |
| `info`  | Default, includes interaction errors |
| `debug` | Investigating issues                 |

Set via `LOG_LEVEL` environment variable.
