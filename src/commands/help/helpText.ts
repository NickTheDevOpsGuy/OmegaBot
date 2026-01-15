// src/commands/help/helpText.ts

import type { CommandListItem } from "../../services/discord/commandMeta.js";

export type HelpTopic =
  | "overview"
  | "fun"
  | "github"
  | "summary"
  | "timezone"
  | "admin"
  | "commands";

/**
 * Help text builder for /help.
 *
 * Goal: stay readable and under Discord limits by splitting into topics.
 * Style: no emojis on the left, no " - " separators.
 */
export function buildHelpText(args: {
  isAdmin: boolean;
  commands: CommandListItem[];
  topic: HelpTopic;
}): string {
  const { isAdmin, commands, topic } = args;

  switch (topic) {
    case "fun":
      return buildFunHelp();

    case "github":
      return buildGitHubHelp();

    case "summary":
      return buildSummaryHelp();

    case "timezone":
      return buildTimezoneHelp();

    case "admin":
      return buildAdminHelp({ isAdmin });

    case "commands":
      return buildCommandsHelp({ isAdmin, commands });

    case "overview":
    default:
      return buildOverviewHelp({ isAdmin });
  }
}

function buildOverviewHelp(args: { isAdmin: boolean }): string {
  const { isAdmin } = args;

  const lines: string[] = [];

  lines.push("**OmegaBot Help**");
  lines.push("");
  lines.push("**Start here**");
  lines.push("Run `/help` any time you forget what I can do.");
  lines.push("Tip: type `/fun` or `/gh` and pick a subcommand from the menu.");
  lines.push("");
  lines.push("**Topics**");
  lines.push("Use `/help topic:<topic>`");
  lines.push(
    `overview, fun, github, summary, timezone${isAdmin ? ", admin" : ""}, commands`,
  );
  lines.push("");
  lines.push("**Quick picks**");
  lines.push("`/fun dadjoke`     Random dad joke");
  lines.push("`/fun poll`        Create a quick poll");
  lines.push("`/gh status`       Check GitHub integration status");
  lines.push("`/summary`         Summarize recent messages");
  lines.push("");
  lines.push("If new commands don’t show up, an admin may need to run the register script.");

  return lines.join("\n");
}

function buildFunHelp(): string {
  const lines: string[] = [];

  lines.push("**Help: Fun**");
  lines.push("");
  lines.push("All fun commands live under `/fun`.");
  lines.push("");
  lines.push("`/fun chucknorris`  Chuck Norris facts (random, category, or search)");
  lines.push("`/fun dadjoke`      Dad jokes (random or search)");
  lines.push("`/fun coinflip`     Heads or tails");
  lines.push("`/fun dice`         Roll dice (custom sides and count)");
  lines.push("`/fun poll`         Quick poll (2–4 options, one vote per user)");
  lines.push("`/fun weather`      Today’s weather for a location");
  lines.push("`/fun weather7`     7-day forecast for a location");
  lines.push("");
  lines.push("Leaderboard views");
  lines.push("`/fun leaderboard`                          Top users");
  lines.push("`/fun leaderboard view:commands`            Top commands");
  lines.push("`/fun leaderboard view:user`                Your per-command breakdown");
  lines.push("`/fun leaderboard view:user user:@Someone`  That user’s breakdown");

  return lines.join("\n");
}

function buildGitHubHelp(): string {
  const lines: string[] = [];

  lines.push("**Help: GitHub**");
  lines.push("");
  lines.push("`/gh issue`     Fetch a GitHub issue by number");
  lines.push("`/gh issues`    List open GitHub issues");
  lines.push("`/gh prs`       List open pull requests");
  lines.push("`/gh status`    Show integration status (config, polling, channels)");
  lines.push("`/pr`           Fetch a single pull request by number (legacy shortcut)");
  lines.push("");
  lines.push("Tip: if `/gh status` shows misconfiguration, check `.env` and setup docs.");

  return lines.join("\n");
}

function buildSummaryHelp(): string {
  const lines: string[] = [];

  lines.push("**Help: Summary & History**");
  lines.push("");
  lines.push("`/summary`      Summarize recent messages (local or LLM mode)");
  lines.push("`/history`      DM recent channel history (file fallback if too long)");
  lines.push("`/playback`     Page through recent messages using buttons");
  lines.push("`/pagination`   Demo the reusable pagination helper");

  return lines.join("\n");
}

function buildTimezoneHelp(): string {
  const lines: string[] = [];

  lines.push("**Help: Timezone**");
  lines.push("");
  lines.push("`/timezone set`    Save your IANA timezone (example: America/New_York)");
  lines.push("`/timezone show`   Display your current timezone");
  lines.push("`/timezone clear`  Remove your saved timezone");

  return lines.join("\n");
}

function buildAdminHelp(args: { isAdmin: boolean }): string {
  const { isAdmin } = args;

  const lines: string[] = [];

  lines.push("**Help: Admin**");
  lines.push("");

  if (isAdmin) {
    lines.push("Welcome config");
    lines.push("`/config welcome-channel set channel:#your-channel`");
    lines.push("`/config welcome-channel clear`");
    lines.push("");
    lines.push("Notes");
    lines.push("You need Manage Server to run admin config commands.");
  } else {
    lines.push("You do not have Manage Server permissions.");
    lines.push("Ask a server admin to configure the welcome channel:");
    lines.push("`/config welcome-channel set channel:#your-channel`");
  }

  return lines.join("\n");
}

function buildCommandsHelp(args: {
  isAdmin: boolean;
  commands: CommandListItem[];
}): string {
  const { isAdmin, commands } = args;

  const lines: string[] = [];

  lines.push("**Help: Commands**");
  lines.push("");
  lines.push("Sanity list of top-level commands currently loaded.");
  lines.push("");

  const pretty = formatCommandList(commands, { isAdmin });

  if (!pretty.length) {
    lines.push("No commands found.");
    lines.push("If this is unexpected, check your command loader and build output.");
    return lines.join("\n");
  }

  lines.push(...pretty);

  return lines.join("\n");
}

function formatCommandList(
  commands: CommandListItem[],
  opts: { isAdmin: boolean },
): string[] {
  if (!commands.length) return [];

  const visible = commands.filter((c) => (opts.isAdmin ? true : !c.adminOnly));

  visible.sort((a, b) => {
    const g = a.group.localeCompare(b.group);
    if (g !== 0) return g;
    return a.name.localeCompare(b.name);
  });

  const out: string[] = [];
  let currentGroup: string | null = null;

  for (const cmd of visible) {
    const groupLabel = titleCase(cmd.group);

    if (currentGroup !== groupLabel) {
      currentGroup = groupLabel;
      out.push("");
      out.push(`**${currentGroup}**`);
    }

    const desc = cmd.description ? `  ${cmd.description}` : "";
    out.push(`/${cmd.name}${desc ? `  ${desc}` : ""}`);
  }

  while (out.length && out[0] === "") out.shift();
  return out;
}

function titleCase(s: string): string {
  if (!s) return "Other";
  return s
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}