export function buildGitHubHelp(): string {
  return [
    "**Help: GitHub**",
    "",
    "`/gh issue`     Look up a GitHub issue",
    "`/gh pr`        Look up a pull request",
    "`/gh status`    Check integration status",
    "",
    "GitHub integration requires configuration in `.env`.",
    "If `/gh status` shows errors, check the setup docs.",
  ].join("\n");
}
