# Troubleshooting

Common issues and how to debug them.

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

   When we recover from collector or button errors without the user seeing "interaction failed", logs include `interactionFailedRecovery: true`. Use this to filter or alert on interaction issues:

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

## Database Issues

### SQLite busy / locked

- Ensure only one bot instance uses the database file.
- Check for long-running transactions or blocking queries.

### Schema mismatches

- Run `npm run db:check` to verify integrity.
- Check `migrations/` for schema changes.

---

## Log Levels

| Level   | Use case                             |
| ------- | ------------------------------------ |
| `error` | Production, minimal logs             |
| `info`  | Default, includes interaction errors |
| `debug` | Investigating issues                 |

Set via `LOG_LEVEL` environment variable.
