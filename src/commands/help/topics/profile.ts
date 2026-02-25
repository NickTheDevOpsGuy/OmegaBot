export function buildProfileHelp(): string {
  return [
    "**Help: Profile**",
    "",
    "Manage your profile, AFK status, and timezone.",
    "",
    "**Commands**",
    "`/profile view`           View your or another user's profile",
    "`/profile view user:@x`   View someone else's profile",
    "`/profile afk message`    Set AFK status",
    "`/profile afk`            Clear AFK status",
    "`/profile timezone`       View your timezone",
    "`/profile timezone zone:America/New_York`  Set timezone",
    "",
    "**Related Commands**",
    "`/info user`       Detailed user info",
    "`/info server`     Server statistics",
    "`/info avatar`     View avatars (size 128–4096, format png/jpg/webp/gif)",
    "`/achievements`    View unlocked achievements",
    "",
    "**Avatar note**",
    "GIF format shows animated avatars; if the user's avatar isn't animated, a static image is returned.",
  ].join("\n");
}
