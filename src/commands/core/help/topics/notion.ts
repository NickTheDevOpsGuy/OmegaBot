export function buildNotionHelp(args: { isAdmin: boolean }): string {
  const { isAdmin } = args;

  return [
    "**Help: Notion & Wiki**",
    "",
    "**For Everyone**",
    "`/wiki`             Search FAQ + Notion wiki together",
    "`/notion search`    Search the configured Notion wiki",
    "`/notion open`      Open a page by title with autocomplete",
    "`/notion browse`    Browse pages by tag",
    "`/notion recent`    Show recently edited pages",
    "`/notion random`    Open a random page",
    "",
    "**Search Tips**",
    "- Clear page titles, tags, and summary fields all help results",
    "- A `Summary` field is preferred for previews when present",
    "- `/notion search` and `/notion open` autocomplete recent page titles",
    "- `/notion browse` and `/notion random` autocomplete tags",
    "- `/wiki source:notion` limits results to Notion only",
    "",
    ...(isAdmin
      ? [
          "**Admin / Knowledge Base**",
          "`/notion status`       Check database access and detected properties",
          "`/notion templates`    View guided add templates and mapped fields",
          "`/notion create-page`  Create a new wiki page",
          "`/notion add`          Open the guided page-creation modal",
          "`/faq add`             Add curated FAQ entries alongside Notion pages",
          "",
          "Notion admin actions require bot-admin access plus a valid `NOTION_TOKEN` and `NOTION_DATABASE_ID`.",
        ]
      : [
          "Admins can also create pages and validate the Notion setup with `/notion status`, `/notion templates`, `/notion create-page`, and `/notion add`.",
        ]),
  ].join("\n");
}
