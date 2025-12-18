# Discord Bot Setup Guide

This guide walks you through creating and configuring a Discord bot for OmegaBot.

## 1. Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Click **New Application**
3. Name it (e.g. OmegaBot)

## 2. Create a Bot User

1. Open your application
2. Go to **Bot**
3. Click **Add Bot**
4. Copy the **Bot Token** (keep it secret)

## 3. Enable Required Bot Settings

In the **Bot** section:

- Enable **Message Content Intent**
- Enable **Server Members Intent** (optional but recommended)

## 4. Invite the Bot to Your Server

Go to **OAuth2 → URL Generator**

- Scopes:
  - bot
  - applications.commands
- Bot Permissions:
  - View Channels
  - Read Message History
  - Send Messages
  - Attach Files
  - Use Slash Commands

Copy the generated URL and open it in your browser to invite the bot.

## 5. Enable Developer Mode

In Discord:

- User Settings → Advanced
- Enable **Developer Mode**

## 6. Get IDs

- Guild ID: Right-click your server → Copy ID
- Channel ID: Right-click channel → Copy ID

You will use these in `.env`.

## Common Issues

- Slash commands not showing → run `npm run register`
- Bot replies but DMs fail → user has DMs closed
- Empty message history → missing **Read Message History** permission

## Official Discord Documentation

If you want more detail or need help beyond this guide, these official resources are useful:

**Discord Developer Portal**

---

## Official Discord Documentation

If you want more detail or need help beyond this guide, these official resources are useful:

- **Discord Developer Portal**  
  [https://discord.com/developers/applications](https://discord.com/developers/applications)

- **Creating a Discord Bot Account**  
  [https://discord.com/developers/docs/getting-started](https://discord.com/developers/docs/getting-started)

- **OAuth2 & Inviting Bots**  
  [https://discord.com/developers/docs/topics/oauth2](https://discord.com/developers/docs/topics/oauth2)

- **Bot Permissions Reference**  
  [https://discord.com/developers/docs/topics/permissions](https://discord.com/developers/docs/topics/permissions)

- **Gateway Intents (Message Content, Members, etc.)**  
  [https://discord.com/developers/docs/topics/gateway#gateway-intents](https://discord.com/developers/docs/topics/gateway#gateway-intents)

- **Discord.js Guide (Slash Commands)**  
  [https://discordjs.guide/interactions/slash-commands.html](https://discordjs.guide/interactions/slash-commands.html)
