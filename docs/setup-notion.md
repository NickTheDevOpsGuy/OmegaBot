# Notion Wiki Setup

This guide connects OmegaBot to a Notion database so:

- Discord users can search wiki content with `/wiki` and `/notion search`
- bot admins can validate the setup with `/notion status`
- bot admins can create new pages with `/notion create-page` or the guided `/notion add`

In this doc, "database" means the Notion database that holds your wiki pages. OmegaBot does not search an entire workspace. It talks to one specific database that you choose in `.env`.

---

## Table of Contents

- [1. Create a Notion integration](#1-create-a-notion-integration)
- [2. Find the database you want OmegaBot to use](#2-find-the-database-you-want-omegabot-to-use)
- [3. Share the database with the integration](#3-share-the-database-with-the-integration)
- [4. Configure admin access](#4-configure-admin-access)
- [5. Register commands after config changes](#5-register-commands-after-config-changes)
- [6. Use the commands](#6-use-the-commands)
- [Search behavior notes](#search-behavior-notes)
- [Troubleshooting](#troubleshooting)

---

## 1. Create a Notion integration

1. Open [Notion integrations](https://www.notion.so/my-integrations)
2. Create a new **internal** integration
3. Give it a recognizable name, for example `Discord-OmegaBot`
4. Copy the integration token

Put that token in `.env`:

```env
NOTION_TOKEN=secret_xxx
```

---

## 2. Find the database you want OmegaBot to use

Open the Notion database that should act as your wiki. This should be the database where each row/page is a wiki entry you want the bot to search.

Do not use:

- a random workspace home page
- a normal standalone Notion page
- a database view URL for the wrong database

When you open the correct database in a browser, the URL will include a long hex ID near the end.

Example:

```text
https://www.notion.so/your-workspace/Built-From-Zero-Wiki-0123456789abcdef0123456789abcdef?v=...
```

That last 32-character value is the database ID OmegaBot needs:

```env
NOTION_DATABASE_ID=0123456789abcdef0123456789abcdef
```

If you are unsure whether you opened the right thing, a good sanity check is this: the page should behave like a database in Notion, not just a plain document. You should see rows/items in it, and OmegaBot should be able to read its schema with `/notion status`.

---

## 3. Share the database with the integration

There is not a separate special URL for this step.

Open the same Notion database URL you used in step 2, for example:

```text
https://www.notion.so/your-workspace/Built-From-Zero-Wiki-0123456789abcdef0123456789abcdef?v=...
```

Then inside that same database page:

1. Click **Share** in the top-right
2. Choose **Invite** or **Connections** depending on your Notion UI
3. Add your integration, for example `Discord-OmegaBot`
4. Confirm the integration now appears in the page/database share list

If this step is skipped, OmegaBot can have a valid `NOTION_TOKEN` and still fail with a Notion `404 object_not_found` error. In practice that usually means one of these:

- the database is not shared with the integration
- `NOTION_DATABASE_ID` points to the wrong object
- the URL copied was for a page/view that is not the actual target database

If you are unsure, test with `/notion status` after updating `.env`.

What `/notion status` tells you:

- whether the bot can reach the configured database
- the database title Notion returned
- the detected title property
- whether a tag-like property was found

If `BOT_ADMIN_AUDIT_CHANNEL_ID` is configured, OmegaBot can also send setup failures and admin-side Notion actions to that audit channel.

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

`BOT_ADMIN_AUDIT_CHANNEL_ID` is optional, but recommended. If set, OmegaBot can send lightweight audit messages there for actions like:

- `/notion status`
- `/notion create-page`
- `/notion add`
- Notion setup/search failures
- FAQ admin changes

---

## 5. Register commands after config changes

```bash
npm run build
npm run register
```

If you already had the bot running, restart it after updating `.env`.

`npm run register` is included here because config and command changes often happen together during setup. If you only changed `.env`, the restart matters most.

---

## 6. Use the commands

User-facing:

- `/wiki query:<term> source:auto`
- `/notion search query:<term>`

Admin-facing:

- `/notion status`
- `/notion create-page title:<title> content:<optional paragraph> tags:<comma,separated>`
- `/notion add template:<optional key>`

`/notion status` is the best first test after setup. Run it before trying search so you can confirm the database is reachable and the schema was detected.

`/notion add` opens a guided Discord modal and can apply template-backed field mappings (configured in `src/config/notionAddTemplates.ts`) so admins can fill extra structured properties without manually building payloads.

Template notes:

- `template` supports autocomplete in Discord (type part of the key/label).
- `basic` is the default template.
- You can customize/add templates in `src/config/notionAddTemplates.ts`.

Curated server docs:

- `/faq add`
- `/faq get`
- `/faq list`
- `/faq remove`

`/wiki` can combine FAQ entries with Notion results, so you can keep quick server-specific answers in FAQ while still surfacing longer wiki pages from Notion.

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

### `/notion status` fails with `object_not_found` or a 404-style Notion error

That usually means one of these:

- `NOTION_DATABASE_ID` is wrong
- the database was not shared with the integration
- the URL you copied was for the wrong page or object

Start by reopening the database URL from step 2 and confirming the integration appears in its **Share** or **Connections** list.

### Search works poorly

Start with clearer page titles. Right now the bot ranks title matches highest and uses block text mainly for result previews.

### Create page works but tags do not

The bot only auto-populates a tags field when the database exposes a property named like `Tags` and its type is one of:

- `multi_select`
- `select`
- `rich_text`

### Access denied or admin action blocked

There are two different access checks involved:

- Notion access: the database must be shared with the integration
- Discord admin access: your Discord account must match one of the allowed admin paths above for `/notion status`, `/notion create-page`, and `/notion add`

Regular users can still use `/notion search` if the Notion integration itself is configured correctly.
