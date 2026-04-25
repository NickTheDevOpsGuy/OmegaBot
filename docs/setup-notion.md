# Notion Wiki Setup

This guide connects OmegaBot to a Notion database so:

- Discord users can search and browse wiki content with `/wiki` and `/notion ...`
- bot admins can validate the setup with `/notion status`
- bot admins can inspect templates and create new pages with `/notion templates`, `/notion create-page`, or the guided `/notion add`

In this doc, "database" means the Notion database that holds your wiki pages. OmegaBot does not search an entire workspace. It talks to one specific database that you choose in `.env`.

---

## Table of Contents

- [1. Create a Notion integration](#1-create-a-notion-integration)
- [2. Find the database you want OmegaBot to use](#2-find-the-database-you-want-omegabot-to-use)
- [3. Share the database with the integration](#3-share-the-database-with-the-integration)
- [4. Recommended database shape](#4-recommended-database-shape)
- [5. Configure admin access](#5-configure-admin-access)
- [6. Register commands after config changes](#6-register-commands-after-config-changes)
- [7. Use the commands](#7-use-the-commands)
- [Preview and search behavior](#preview-and-search-behavior)
- [Guided template notes](#guided-template-notes)
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

## 4. Recommended database shape

OmegaBot only needs a valid Notion database with a title property, but the best results come from a small amount of structure.

Required:

- one Notion **title** property for the page name

Recommended:

- a tag-like property named something like `Tags`
- a preview property named `Summary`
- clear page titles
- a short opening paragraph in the page body for fallback previews

Tag property support:

- `multi_select`
- `select`
- `rich_text`

Preview property support:

- `Summary`
- `Preview`
- `Excerpt`
- `Description`

Best practice:

- Use `Summary` as a rich-text field when you want clean, predictable previews in `/notion` and `/wiki`.
- Keep tags short and consistent so `/notion browse` and tag autocomplete stay useful.
- If you skip a summary field, OmegaBot will fall back to reading page content, including nested blocks like toggles and columns when possible.

---

## 5. Configure admin access

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
- `/notion templates`
- `/notion create-page`
- `/notion add`
- Notion setup/search failures
- FAQ admin changes

---

## 6. Register commands after config changes

```bash
npm run build
npm run register
```

If you already had the bot running, restart it after updating `.env`.

`npm run register` is included here because config and command changes often happen together during setup. If you only changed `.env`, the restart matters most.

---

## 7. Use the commands

Most Notion and wiki commands default to private replies. If you want the reply posted in-channel, use `private:false`.

User-facing:

- `/wiki query:<term> source:auto limit:<count> private:<true|false>`
- `/notion search query:<term> limit:<count> private:<true|false>`
- `/notion open title:<page title> private:<true|false>`
- `/notion browse tag:<tag> limit:<count> private:<true|false>`
- `/notion recent limit:<count> private:<true|false>`
- `/notion random tag:<optional tag> private:<true|false>`

Admin-facing:

- `/notion status private:<true|false>`
- `/notion templates private:<true|false>`
- `/notion create-page title:<title> content:<optional paragraph> tags:<comma,separated> private:<true|false>`
- `/notion add template:<optional key> private:<true|false>`

`/notion status` is the best first test after setup. Run it before trying search so you can confirm the database is reachable and the schema was detected.

Quick command behavior:

- `/notion search` ranks page titles highest, but tags and summary-style fields now help surface relevant pages too.
- `/notion open` is the fastest exact-page jump flow and supports title autocomplete.
- `/notion browse` lists pages by tag and supports tag autocomplete.
- `/notion recent` shows recently edited pages.
- `/notion random` picks a random page from the database, optionally filtered by tag.
- `/notion templates` shows which guided templates exist and which Notion properties they map to.
- `/wiki` can combine FAQ entries with Notion results, so you can keep quick server-specific answers in FAQ while still surfacing longer wiki pages from Notion.

Search and browse examples:

- `/notion search query:capcut limit:5`
- `/notion open title:Capcut`
- `/notion browse tag:video`
- `/notion recent limit:3`
- `/notion random tag:video`
- `/wiki query:onboarding source:notion limit:5`

Create-page examples:

- `/notion create-page title:Capcut content:Quick editor setup steps tags:video,editing`
- `/notion create-page title:Server FAQ content:Start here for new members`

Result formatting:

- `/notion` and `/wiki` show clickable page titles instead of long raw Notion URLs.
- When available, replies also include tags and last-edited time.

---

## Preview and search behavior

- Notion searches rank page titles highest, but also use tags and summary-style fields when available.
- If a page has a `Summary`-style property, search results prefer that text for the preview.
- Otherwise, search results fall back to text pulled from the page body when available.
- The body fallback can read nested blocks such as toggles and columns, not just top-level paragraphs.
- `/notion search` and `/notion open` autocomplete recent page titles.
- `/notion browse` and `/notion random` autocomplete known tags.
- `/wiki source:notion` limits search to the Notion wiki only.
- If a page has no summary field and no readable body text, OmegaBot may still show `No page preview available yet.`

If you want the cleanest search results:

- keep page titles specific
- use a consistent `Tags` property
- add a short `Summary` field
- put a short opening paragraph at the top of long pages

---

## Guided template notes

`/notion add` opens a guided Discord modal and can apply template-backed field mappings (configured in `src/config/notionAddTemplates.ts`) so admins can fill extra structured properties without manually building payloads.

Template notes:

- `template` supports autocomplete in Discord (type part of the key/label).
- `basic` is the default template.
- You can customize/add templates in `src/config/notionAddTemplates.ts`.
- The guided modal always includes `title`, `content`, and `tags`.
- Because Discord modals only allow 5 rows, OmegaBot currently supports at most **2 extra template fields** per guided template.
- `/notion templates` is the easiest way to confirm what your live template keys and mapped fields look like.

Curated server docs:

- `/faq add`
- `/faq get`
- `/faq list`
- `/faq remove`

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

Start with clearer page titles, tags, and summary text. The bot ranks title matches highest and uses tags, summary fields, and block text to improve the rest.

### Page previews are missing or weak

Start here:

- add a `Summary` rich-text field
- make sure the page body has readable paragraph text near the top
- avoid leaving the page body empty if you want fallback previews

If a page still shows `No page preview available yet.`, it usually means OmegaBot could not find a supported summary field or readable text blocks.

### Create page works but tags do not

The bot only auto-populates a tags field when the database exposes a property named like `Tags` and its type is one of:

- `multi_select`
- `select`
- `rich_text`

### Access denied or admin action blocked

There are two different access checks involved:

- Notion access: the database must be shared with the integration
- Discord admin access: your Discord account must match one of the allowed admin paths above for `/notion status`, `/notion templates`, `/notion create-page`, and `/notion add`

Regular users can still use `/notion search`, `/notion open`, `/notion browse`, `/notion recent`, and `/notion random` if the Notion integration itself is configured correctly.

### Guided template says fields are invalid or missing

Check all of these:

- the template key exists in `src/config/notionAddTemplates.ts`
- the mapped Notion property names exactly match the database schema
- the template does not define more than 2 extra fields
