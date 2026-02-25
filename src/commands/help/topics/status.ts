export function buildStatusHelp(): string {
  return [
    "**Help: Service Status**",
    "",
    "Check external platform status (Vercel, Supabase).",
    "",
    "**Commands**",
    "`/status vercel`     Vercel platform status (builds, deploy, edge)",
    "`/status supabase`   Supabase platform status (API, DB, auth)",
    "",
    "Shows overall status, degraded components, and active incidents.",
    "Uses public Statuspage APIs—no API keys required.",
  ].join("\n");
}
