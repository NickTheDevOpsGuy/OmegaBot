export function buildQuotesHelp(): string {
  return [
    "**Help: Quotes**",
    "",
    "Save and view memorable server quotes.",
    "",
    "**Commands**",
    '`/fun quote add author:@user text:"..."`   Add a quote',
    "`/fun quote random`                          Get a random quote",
    "`/fun quote list limit:5|10|25`              List recent quotes (default: 25)",
    "`/fun quote remove id:123`                  Remove a quote (ID has autocomplete)",
    "`/fun quote search query:... limit:5|10|25`  Search quotes",
    "",
    "**Context menu**",
    "Right-click a message → **Quote** to save it as a server quote.",
    "Works with regular text and embed titles/descriptions (human or bot messages).",
    "",
    "**Permissions**",
    "Only the person who added a quote (or users with Manage Messages) can remove it.",
  ].join("\n");
}
