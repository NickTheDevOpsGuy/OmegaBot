# FAQ for Server Admins

Common questions when running OmegaBot.

---

## Table of Contents

- [Who can use /admin?](#who-can-use-admin)
- [How do I add Hangman words?](#how-do-i-add-hangman-words)
- [Who can manage FAQ / Notion wiki content?](#who-can-manage-faq--notion-wiki-content)
- [Why do users see "This interaction failed"?](#why-do-users-see-this-interaction-failed)
- [How do I back up the bot?](#how-do-i-back-up-the-bot)
- [Weather / GitHub / summaries don't work](#weather--github--summaries-dont-work)
- [How do I see if the bot is healthy?](#how-do-i-see-if-the-bot-is-healthy)
- [Rate limits / cooldowns](#rate-limits--cooldowns)

---

## Who can use /admin?

**Stats and health** use the same rules as below. **Timeout, kick, and ban** use an extra rule when **`MODERATION_ALLOWED_ROLE_IDS`** is set.

- **If `MODERATION_ALLOWED_ROLE_IDS` is set in `.env`:**  
  Only users whose Discord user ID is in **`ADMIN_USER_IDS`** **or** who have one of the listed **role IDs** can run `/admin timeout`, `/admin kick`, and `/admin ban`. No other server roles (e.g. Manage Server) can use those three subcommands. Stats and health still follow the normal rules below.

- **Otherwise**, users can run `/admin` if **either**:

1. **Allowlist in `.env`** – Their Discord user ID is in **`ADMIN_USER_IDS`** (comma-separated).  
   Example: `ADMIN_USER_IDS=123456789012345678,987654321098765432`  
   Get your ID: Developer Mode → Right-click yourself → Copy ID.

2. **Server roles** – They have one of:
   - Discord **Administrator**, **Manage Server**, or **Moderate Members**, or
   - A role added as a moderator via **`/config moderator-role`**.

If neither applies, the command responds with a permission error. See [Environment Setup – Admin / Moderation](setup-env.md#admin--moderation-optional).

---

## How do I add Hangman words?

Set **`HANGMAN_ADMIN_ROLE_ID`** in `.env` to a Discord role ID. Users with that role can run:

- `/fun hangman words add word:<word> difficulty:<easy|medium|hard>`
- `/fun hangman words list [difficulty]`

See [Environment Setup](setup-env.md#hangman-word-management-optional).

---

## Who can manage FAQ / Notion wiki content?

These actions use the broader bot-admin rules:

- `/faq add`
- `/faq remove`
- `/notion status`
- `/notion templates`
- `/notion create-page`
- `/notion add`

Access is granted by any of:

- `ADMIN_USER_IDS`
- Discord **Administrator**
- Discord **Manage Server**
- `BOT_ADMIN_ROLE_IDS`

See [Environment Setup – Bot Admin / Knowledge Base Admin](setup-env.md#bot-admin--knowledge-base-admin-optional) and [Notion Wiki Setup](setup-notion.md).

---

## Why do users see "This interaction failed"?

The bot didn’t respond within Discord’s ~3 second window, or the interaction expired. See [Troubleshooting](troubleshooting.md) for causes and how to check logs and `/admin health`.

---

## How do I back up the bot?

Run **`npm run db:backup`** (or `scripts/backup-db.sh`). Backups go to `data/backups/` by default; the script keeps the last N backups (configurable via `BACKUP_KEEP`). You can run it while the bot is running. See [Runbook – Database](runbook.md#database).

---

## Weather / GitHub / summaries don’t work

Those features are optional and require env vars. Check startup logs for **`[startup] optional features`** to see what’s enabled. Set the right keys in `.env`; see [Environment Setup](setup-env.md) and [.env.example](../.env.example).

---

## How do I see if the bot is healthy?

- **In Discord**: Use **`/admin health`** (requires [admin access](#who-can-use-admin): `ADMIN_USER_IDS` in `.env` or server moderator role). Shows DB status, env summary, and interaction error counts.
- **HTTP**: Set `METRICS_PORT=9090` (or another port) in `.env` to enable `GET /health` and `GET /metrics` for load balancers or monitoring. See [Runbook – Health](runbook.md#health).

---

## Rate limits / cooldowns

Slots (3s), blackjack (5s), dice (2s), darts (2s), and hangman (10s) have per-user cooldowns. Stats and leaderboard views are not rate limited. See [Command Reference – Rate limits](commands.md#rate-limits-per-user-to-prevent-spam).
