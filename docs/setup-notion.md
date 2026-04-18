# Notion Wiki Setup

This guide wires OmegaBot to a Notion database so Discord users can search pages with `/wiki` and `/notion search`, while admins can create pages with `/notion create-page`.

---

## 1. Create a Notion integration

1. Open [Notion integrations](https://www.notion.so/my-integrations)
2. Create a new **internal** integration
3. Copy the integration token

Put that token in `.env`:

```env
NOTION_TOKEN=secret_xxx
```

---

## 2. Find your database ID

Open the target Notion database in a browser. The URL will include a long hex ID near the end.

Example:

```text
https://www.notion.so/your-workspace/Built-From-Zero-Wiki-0123456789abcdef0123456789abcdef?v=...
```

That last 32-character value is the database ID:

```env
NOTION_DATABASE_ID=0123456789abcdef0123456789abcdef
```

---

## 3. Share the database with the integration

Inside Notion:

1. Open the target database
2. Click **Share**
3. Invite the integration you created

If you skip this step, OmegaBot will have a token but still fail with access errors.

---

## 4. Configure admin access

For Notion admin actions, OmegaBot accepts any of these:

- `ADMIN_USER_IDS`
- Discord **Administrator**
- Discord **Manage Server**
- `BOT_ADMIN_ROLE_IDS`

Example:

```env
ADMIN_USER_IDS=123456789012345678
BOT_ADMIN_ROLE_IDS=222222222222222222
BOT_ADMIN_AUDIT_CHANNEL_ID=333333333333333333
```

`BOT_ADMIN_AUDIT_CHANNEL_ID` is optional, but useful if you want a log channel when admins add/remove FAQ docs or create Notion pages.

---

## 5. Register commands after config changes

```bash
npm run build
npm run register
```

If you already had the bot running, restart it after updating `.env`.

---

## 6. Use the commands

User-facing:

- `/wiki query:<term> source:auto`
- `/notion search query:<term>`

Admin-facing:

- `/notion status`
- `/notion create-page title:<title> content:<optional paragraph> tags:<comma,separated>`

Curated server docs:

- `/faq add`
- `/faq get`
- `/faq list`
- `/faq remove`

`/wiki` searches FAQ entries first and can also include Notion results, so you can keep quick server-specific answers in FAQ while still surfacing richer wiki pages from Notion.

---

## Search behavior notes

- Notion page **titles** are the primary search key right now
- Search results include a short preview pulled from the page’s first block children when available
- If you want better search quality later, adding clear page titles and tags in Notion helps a lot

---

## Troubleshooting

### `/notion status` says Notion is not configured

Check that both are present in `.env`:

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

### Search works poorly

Start with clearer page titles. Right now the bot ranks title matches highest and uses block text mainly for result previews.

### Create page works but tags do not

The bot only auto-populates a tags field when the database exposes a property named like `Tags` and its type is one of:

- `multi_select`
- `select`
- `rich_text`

### Access denied

Make sure the Notion database is shared with the integration and that your Discord account has one of the allowed admin paths above.
