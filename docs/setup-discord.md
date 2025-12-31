# Discord Bot Setup Guide (OmegaBot)

This guide walks you through creating and configuring a Discord bot for **OmegaBot**, including required gateway intents, installation settings, and common pitfalls.

---

## 1. Create a Discord Application

1. Go to [Applications](https://discord.com/developers/applications)
2. Click **New Application**
3. Name it (e.g. `OmegaBot`)
4. Open the application

---

## 2. Create a Bot User (Required)

1. In the left sidebar, click **Bot**
2. Click **Add Bot**
3. Confirm

> Without a bot user, gateway intents and bot tokens will not behave correctly.

---

## 3. Copy Required Credentials

### Bot Token
- Location: **Bot → Token**
- Click **Reset Token** or **Copy**
- Store securely in `.env`:

```env
DISCORD_TOKEN=your_bot_token_here
```

### Application ID
- Location: **General Information → Application ID**
- Store in `.env`:

```env
DISCORD_APP_ID=your_application_id_here
```

> The Application ID is **not secret**.  
> The Bot Token **must be kept private**.

---

## 4. Select Installation Type (Important)

Go to **Installation** (sometimes labeled Integration Type).

### Enable:
- ✅ **Guild Install**

### Do NOT rely on:
- ❌ User Install (OAuth-only apps, no gateway events)

Guild Install is required for:
- Gateway bots
- Slash commands
- Member join events
- Welcome messages

Save changes.

---

## 5. Enable Privileged Gateway Intents

Go to **Bot → Privileged Gateway Intents**.

Enable:
- ✅ **Server Members Intent**

This is required for:
- `guildMemberAdd`
- welcome / onboarding messages

Optional (enable only if needed later):
- Message Content Intent
- Presence Intent

Click **Save Changes**.

> Both the **portal toggle** and the **code intent** must be enabled.

---

## 6. Invite the Bot to Your Server

Go to **OAuth2 → URL Generator**.

### Scopes
- ✅ `bot`
- ✅ `applications.commands`

### Bot Permissions (minimum)
- View Channels
- Send Messages
- Read Message History

Copy the generated URL and open it in your browser to invite the bot.

> If you change permissions later, you must **re-invite** the bot.

---

## 7. Enable Developer Mode (Local Setup)

In Discord:
1. User Settings → Advanced
2. Enable **Developer Mode**

This allows copying IDs.

---

## 8. Get IDs

- **Guild ID**: Right-click server → Copy ID
- **Channel ID**: Right-click channel → Copy ID

Add to `.env` as needed:

```env
DISCORD_GUILD_ID=your_guild_id_here
WELCOME_CHANNEL_ID=your_channel_id_here
```

---

## 9. Verify Gateway Intents in Code

Your bot client **must request the same intents** you enabled in the portal.

Example:

```ts
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});
```

Missing either side causes:
- Gateway disconnects
- “Used disallowed intents” errors

---

## Testing Welcome Messages

The `guildMemberAdd` event **only fires when a real join happens**.

Valid test methods:
- Join with an alt account
- Ask an admin to kick you once and rejoin
- Create a private test server and join there

There is no “fake join” or manual trigger in Discord.

---

## Common Issues

### Bot logs in but welcome message never fires
- Server Members Intent not enabled in portal
- `GatewayIntentBits.GuildMembers` missing in code
- Bot was not restarted after enabling intent

### Slash commands not showing
- Run the command registration script
- Ensure `applications.commands` scope was used on invite

### Bot cannot send welcome message
- Missing **View Channel** or **Send Messages** permission
- Wrong `WELCOME_CHANNEL_ID`
- Channel overrides blocking the bot role

---

## Official Discord Documentation

- Developer Portal  

  [Applications](https://discord.com/developers/applications)

- Getting Started

  [Getting-Started](https://discord.com/developers/docs/getting-started)

- OAuth2 & Inviting Bots

  [Oauth2](https://discord.com/developers/docs/topics/oauth2)

- Bot Permissions Reference

  [Permissions](https://discord.com/developers/docs/topics/permissions)

- Gateway Intents

  [Gateway](https://discord.com/developers/docs/topics/gateway#gateway-intents)

- discord.js Slash Commands

  [Slash Commands](https://discordjs.guide/interactions/slash-commands.html)
