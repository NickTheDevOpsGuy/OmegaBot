export function buildAdminHelp(args: { isAdmin: boolean }): string {
  if (!args.isAdmin) {
    return [
      "**Help: Admin**",
      "",
      "You need Manage Server permissions to access admin commands.",
    ].join("\n");
  }

  return [
    "**Help: Admin**",
    "",
    "**Server Configuration**",
    "`/config view`                  View all settings",
    "`/config welcome set`           Set welcome channel",
    "`/config welcome clear`         Clear welcome channel",
    "`/config starboard set`         Set up starboard",
    "`/config starboard clear`       Disable starboard",
    "",
    "**Knowledge Base**",
    "`/notion status`                Check Notion setup",
    "`/notion templates`             View guided add templates",
    "`/notion create-page`           Create a wiki page",
    "`/notion add`                   Guided Notion page prompt",
    "`/faq add`                      Add a curated FAQ entry",
    "`/faq remove`                   Remove a curated FAQ entry",
    "",
    "**Moderation**",
    "`/admin timeout`    Timeout a user",
    "`/admin kick`       Kick a user",
    "`/admin ban`        Ban a user",
    "",
    "**Other**",
    "`/giveaway start`   Create a giveaway",
    "`/giveaway end`     End giveaway early",
    "`/suggestion`       Manage suggestions",
  ].join("\n");
}
