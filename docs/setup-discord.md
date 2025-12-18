# Discord Bot Setup Guide

This guide walks you through creating and configuring a Discord bot for OmegaBot.

---

## 1. Create a Discord Application

1. Go to  
   https://discord.com/developers/applications
2. Click **New Application**
3. Name it (e.g. OmegaBot)

Official docs:  
https://discord.com/developers/docs/getting-started

---

## 2. Create a Bot User

1. Open your application
2. Go to **Bot**
3. Click **Add Bot**
4. Copy the **Bot Token** (keep it secret)

⚠️ Never commit this token. Treat it like a password.

Official docs:  
https://discord.com/developers/docs/topics/oauth2#bots

---

## 3. Enable Required Bot Settings

In the **Bot** section:

- Enable **Message Content Intent**
- Enable **Server Members Intent** (optional, future-proofing)

Gateway Intents docs:  
https://discord.com/developers/docs/topics/gateway#gateway-intents

---

## 4. Invite the Bot to Your Server

Go to **OAuth2 → URL Generator**

**Scopes**
- bot
- applications.commands

**Bot Permissions**
- View Channels
- Read Message History
- Send Messages
- Attach Files
- Use Slash Commands

OAuth2 URL Generator docs:  
https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-url-generator

---

## 5. Enable Developer Mode

In Discord:

- User Settings → Advanced
- Enable **Developer Mode**

Discord support article:  
https://support.discord.com/hc/en-us/articles/206346498

---

## 6. Get IDs

- Guild ID: Right-click your server → Copy ID
- Channel ID: Right-click channel → Copy ID

These values go in `.env`.

---

## Local vs Server Deployment

- You can run OmegaBot locally for development
- Long-term usage is best on a VPS (EC2, DigitalOcean, Fly.io, etc.)
- Only one instance should run per bot token

---

## GitHub Integration (Optional)

If using GitHub commands or PR announcements:

- Create a GitHub Personal Access Token
- Minimum permissions:
  - Contents: Read
  - Issues: Read
  - Pull requests: Read

GitHub PAT docs:  
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

---

## Common Issues

- Slash commands not showing → run `npm run register`
- Bot replies but DMs fail → user has DMs closed
- Empty history → missing Read Message History permission
