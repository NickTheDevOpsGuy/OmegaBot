# Discord Bot Setup Guide (OmegaBot)

This guide walks you through creating and configuring a Discord bot for **OmegaBot**, including
required scopes, permissions, gateway intents, and common moderation pitfalls.

---

## Table of Contents

- [Required OAuth Scopes](#required-oauth-scopes)
- [Required Bot Permissions](#required-bot-permissions)
- [Notion Audit Channel Permissions](#notion-audit-channel-permissions)
- [Gateway Intents](#gateway-intents)
- [Why Admin Commands Might Fail](#why-admin-commands-might-fail)
- [Moderator Roles (SQLite-backed)](#moderator-roles-sqlite-backed)
- [Re-inviting the Bot](#re-inviting-the-bot)
- [Helpful Links](#helpful-links)

---

## Required OAuth Scopes

When generating the Discord invite URL, select these OAuth2 scopes:

- `bot`
- `applications.commands`

Do not use workspace/API scopes like `guilds`, `guilds.channels.read`, `guilds.members.read`, `dm_channels.read`, or `presences.write` for the server bot invite. OmegaBot uses the Discord bot gateway and slash-command install flow, not those OAuth user/API scopes.

If `applications.commands` is missing, slash commands may not install or update correctly. If you change scopes later, you must re-invite the bot.

---

## Required Bot Permissions

For full functionality, especially **admin/moderation commands**, the bot role needs:

### Core

- View Channels
- Send Messages
- Read Message History
- Embed Links
- Use Slash Commands

### Notion Audit Channel Permissions

Notion itself is configured in [Notion Wiki Setup](setup-notion.md), but the optional Discord audit channel still depends on Discord permissions.

If `BOT_ADMIN_AUDIT_CHANNEL_ID` is set, OmegaBot sends lightweight audit messages for Notion admin actions such as `/notion status`, `/notion templates`, `/notion create-page`, and `/notion add`.

The bot must have these permissions in the configured audit channel:

- View Channel
- Send Messages

If the audit channel has channel-specific role overrides, check that the OmegaBot role is allowed there too. Server-level permissions are not enough when a channel override denies access. When these permissions are missing, the Notion command can still run, but the audit message will not be posted.

### Moderation (Admin commands)

- Moderate Members (timeouts)
- Kick Members
- Ban Members

⚠️ The bot’s role **must be higher** than the roles it is moderating.

---

## Gateway Intents

OmegaBot always requests these standard gateway intents:

- `Guilds`
  - Required for slash commands, guild context, channel lookups, and most bot operation
- `GuildMessages`
  - Required for message-based features in servers, including message event handling
- `GuildMessageReactions`
  - Required for reaction-driven features like starboard
- `DirectMessages`
  - Required for DM handling

These do **not** need a special toggle in the Discord Developer Portal.

Enable these in **Developer Portal → Bot → Privileged Gateway Intents** only when you need the matching feature:

- **Server Members Intent** (required for auto-role, welcome, etc.)
- **Message Content Intent** (required only if you want message-based chat: DM the bot or @mention it to get an LLM reply; uses `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`)

OmegaBot only requests these when the matching `.env` flags are enabled:

```env
DISCORD_ENABLE_GUILD_MEMBERS_INTENT=true
DISCORD_ENABLE_MESSAGE_CONTENT_INTENT=true
```

If either flag is `true`, the same intent must also be enabled in the Discord Developer Portal.

### Feature → Intent Mapping

- Slash commands, config, admin, info, FAQ, GitHub, Notion, web-linked commands
  - `Guilds`
- Starboard / reaction-based message features
  - `GuildMessageReactions`
- DM support
  - `DirectMessages`
- DM / @mention chat message handling
  - `GuildMessages` and `DirectMessages`
  - `Message Content Intent` also required if you want the bot to read message text
- Welcome flow / auto-role on member join
  - `GuildMembers`

If you are unsure, the safest setup is:

- Always allow the default non-privileged intents the bot requests
- Turn on `Server Members Intent` only if you use welcome / auto-role
- Turn on `Message Content Intent` only if you use DM or @mention chat

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
  [Permissions](https://discord.com/developers/docs/topics/permissions)

- OAuth2 Scopes
  [OAuth](https://discord.com/developers/docs/topics/oauth2)
