# Discord Bot Setup Guide (OmegaBot)

This guide walks you through creating and configuring a Discord bot for **OmegaBot**, including
required scopes, permissions, gateway intents, and common moderation pitfalls.

---

## Required OAuth Scopes

When inviting the bot, you **must** include:

- bot
- applications.commands

If you change scopes later, you must re-invite the bot.

---

## Required Bot Permissions

For full functionality, especially **admin/moderation commands**, the bot role needs:

### Core

- View Channels
- Send Messages
- Read Message History
- Embed Links

### Moderation (Admin commands)

- Moderate Members (timeouts)
- Kick Members
- Ban Members

⚠️ The bot’s role **must be higher** than the roles it is moderating.

---

## Gateway Intents

Enable in **Developer Portal → Bot → Privileged Gateway Intents**:

- Server Members Intent (required)

Your code must also request the same intent.

---

## Why Admin Commands Might Fail

If `/admin timeout`, `/admin kick`, or `/admin ban` do nothing:

- User is not an Administrator or approved moderator
- Bot role is below target user
- Bot lacks permission (Kick/Ban/Moderate)
- Bot was not re-invited after permission changes

---

## Moderator Roles (SQLite-backed)

OmegaBot supports moderator roles stored in SQLite.

Admins must configure these roles using the config command.
Only users with:

- Administrator permission, OR
- A configured moderator role

can run moderation commands.

---

## Re-inviting the Bot

You MUST re-invite the bot if you change:

- Permissions
- Scopes
- Installation type

Old invites do not update permissions.

---

## Helpful Links

- Discord Developer Portal
  [Applications](https://discord.com/developers/applications)

- Bot Permissions Reference
  https://discord.com/developers/docs/topics/permissions

- OAuth2 Scopes
  https://discord.com/developers/docs/topics/oauth2
