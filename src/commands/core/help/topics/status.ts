export function buildStatusHelp(): string {
  return [
    "**Help: Service Status**",
    "",
    "Check external platform status (infrastructure and LLMs).",
    "",
    "**Infrastructure**",
    "`/status vercel`     Vercel platform status (builds, deploy, edge)",
    "`/status supabase`   Supabase platform status (API, DB, auth)",
    "",
    "**LLM / AI**",
    "`/status chatgpt`   OpenAI / ChatGPT status (API, chat, Sora, etc.)",
    "`/status claude`    Anthropic Claude status (claude.ai, API, Claude Code)",
    "`/status cursor`    Cursor IDE status (app, chat, tab, codebase indexing)",
    "",
    "Shows overall status, degraded components, and active incidents.",
    "Uses public Statuspage APIs—no API keys required.",
  ].join("\n");
}
