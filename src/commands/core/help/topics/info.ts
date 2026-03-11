export function buildInfoHelp(): string {
  return [
    "**Help: Info Commands**",
    "",
    "`/info user`     View user details, roles, join date, permissions",
    "`/info server`   View server stats (members, channels, roles); optional **invite** creates a 24h invite link",
    "`/info avatar`   View a user's avatar (size 128–4096, format PNG/JPEG/WebP/GIF)",
    "",
    "Replies are private by default; use `private: false` to show in channel.",
  ].join("\n");
}
