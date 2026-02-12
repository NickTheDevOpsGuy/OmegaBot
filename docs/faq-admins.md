# FAQ for Server Admins

Common questions when running OmegaBot.

---

## How do I add Hangman words?

Set **`HANGMAN_ADMIN_ROLE_ID`** in `.env` to a Discord role ID. Users with that role can run:

- `/fun hangman words add word:<word> difficulty:<easy|medium|hard>`
- `/fun hangman words list [difficulty]`

See [Environment Setup](setup-env.md#hangman-word-management-optional).

---

## Why do users see "This interaction failed"?

The bot didn’t respond within Discord’s ~3 second window, or the interaction expired. See [Troubleshooting](troubleshooting.md) for causes and how to check logs and `/admin health`.

---

## How do I back up the bot?

Copy the SQLite database file (default: `data/omegabot.db`). You can copy it while the bot is running. See [Runbook – Database](runbook.md#database).

---

## Weather / GitHub / summaries don’t work

Those features are optional and require env vars. Check startup logs for **`[startup] optional features`** to see what’s enabled. Set the right keys in `.env`; see [Environment Setup](setup-env.md) and [.env.example](../.env.example).

---

## How do I see if the bot is healthy?

Use **`/admin health`** (requires Manage Server). It shows DB status, env summary, and interaction error counts. See [Runbook – Health](runbook.md#health).

---

## Rate limits / cooldowns

Slots (3s), blackjack (5s), dice (2s), darts (2s), and hangman (10s) have per-user cooldowns. Stats and leaderboard views are not rate limited. See [Command Reference – Rate limits](commands.md#rate-limits-per-user-to-prevent-spam).
