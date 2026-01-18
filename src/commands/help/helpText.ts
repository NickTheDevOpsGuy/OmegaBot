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
  lines.push("`/fun joke random` Community jokes across 13 categories");
  lines.push("`/fun poll`        Create a quick poll");
  lines.push("`/fun weather`     Weather for a location");
  lines.push("`/gh status`       Check GitHub integration status");
  lines.push("`/summary`         Summarize recent messages");
  lines.push("`/timezone show`   Show your saved timezone");
  lines.push("");
  lines.push(
    "If new commands don't show up, an admin may need to run the register script.",
  );

  return lines.join("\n");
}

function buildFunHelp(): string {
  const lines: string[] = [];

  lines.push("**Help: Fun**");
  lines.push("");
  lines.push("All fun commands live under `/fun`.");
  lines.push(
    "Most fun commands support `ephemeral:true` to only show the result to you.",
  );
  lines.push("");

  lines.push("**Joke (Community)**");
  lines.push("`/fun joke`     User-submitted jokes with 13 categories");
  lines.push("Subcommands");
  lines.push("`/fun joke random`       Get a random joke");
  lines.push("`/fun joke add`          Add a new joke to the database");
  lines.push("`/fun joke list`         Browse recent jokes");
  lines.push("`/fun joke remove`       Remove a joke (moderators only)");
  lines.push("Categories");
  lines.push(
    "boomer, genx, millennial, genz, genalpha, random, tech, dark, wholesome, anti, puns, observational, dad",
  );
  lines.push("Examples");
  lines.push("`/fun joke random`");
  lines.push("`/fun joke random category:genz`");
  lines.push("`/fun joke random category:tech`");
  lines.push("`/fun joke add text:Why did... category:millennial`");
  lines.push("`/fun joke list category:dad`");
  lines.push("");

  lines.push("**Coin Flip**");
  lines.push("`/fun coinflip`     Flip a coin (results tracked for stats)");
  lines.push("Examples");
  lines.push("`/fun coinflip`");
  lines.push("`/fun coinflip ephemeral:true`");
  lines.push("");

  lines.push("**Coin Stats**");
  lines.push("`/fun coinstats`    View coin flip statistics and leaderboards");
  lines.push("Options");
  lines.push("`user`         Check another user's stats");
  lines.push("`leaderboard`  Show top flippers (true/false)");
  lines.push("Examples");
  lines.push("`/fun coinstats`");
  lines.push("`/fun coinstats user:@Someone`");
  lines.push("`/fun coinstats leaderboard:true`");
  lines.push("");

  lines.push("**Dice**");
  lines.push("`/fun dice`");
  lines.push("Options");
  lines.push("`sides`  2–100 (default 6)");
  lines.push("`count`  1–10  (default 1)");
  lines.push("Examples");
  lines.push("`/fun dice`");
  lines.push("`/fun dice sides:20`");
  lines.push("`/fun dice sides:6 count:10`");
  lines.push("");

  lines.push("**Poll**");
  lines.push("`/fun poll`");
  lines.push("Notes");
  lines.push("2–4 options");
  lines.push("One vote per user");
  lines.push("Examples");
  lines.push("`/fun poll question:Best pizza? option1:NY option2:Chicago`");
  lines.push("`/fun poll question:Tonight? option1:R6 option2:Netflix option3:Gym`");
  lines.push("");

  lines.push("**Weather**");
  lines.push("`/fun weather`      Current conditions + today");
  lines.push("`/fun weather7`     Current conditions + 7-day forecast");
  lines.push("Options");
  lines.push("`location`  required");
  lines.push("`unit`      f or c (default f)");
  lines.push("Examples");
  lines.push("`/fun weather location:Sharon, MA`");
  lines.push("`/fun weather location:Boston, MA unit:c`");
  lines.push("`/fun weather7 location:02110`");
  lines.push("");

  lines.push("**Leaderboard**");
  lines.push("`/fun leaderboard`");
  lines.push("Options");
  lines.push("`view`   users | commands | user (default users)");
  lines.push("`user`   only used when view:user (defaults to you)");
  lines.push("`limit`  1–25 (default 10)");
  lines.push("Examples");
  lines.push("`/fun leaderboard`");
  lines.push("`/fun leaderboard view:commands limit:10`");
  lines.push("`/fun leaderboard view:user`");
  lines.push("`/fun leaderboard view:user user:@Someone`");

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
  lines.push(
    "Save your timezone once, then compare times with other users or locations.",
  );
  lines.push(
    "We show both the IANA timezone and an offset like UTC-05:00 when possible.",
  );
  lines.push("");

  lines.push("**Commands**");
  lines.push("`/timezone set`      Save your IANA timezone");
  lines.push("`/timezone show`     Display your current saved timezone");
  lines.push("`/timezone clear`    Remove your saved timezone");
  lines.push("`/timezone now`      Show the current time in a timezone or location");
  lines.push("`/timezone convert`  Convert a time from one timezone to another");
  lines.push("`/timezone compare`  Compare your time with another user (if both set)");
  lines.push("");

  lines.push("**Examples**");
  lines.push("`/timezone set tz:America/New_York`");
  lines.push("`/timezone show`");
  lines.push("`/timezone now tz:America/Los_Angeles`");
  lines.push("`/timezone now location:02110`");
  lines.push("`/timezone convert time:14:30 from:America/New_York to:America/Chicago`");
  lines.push("`/timezone compare user:@Someone`");

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
