// src/commands/help/helpText.ts
//
// FIXED VERSION - matches actual bot commands (no chucknorris/dadjoke/weather7)
//

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
 * Style: no emojis on the left, no separators.
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

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

function buildOverviewHelp(args: { isAdmin: boolean }): string {
  const { isAdmin } = args;

  return [
    "**OmegaBot Help**",
    "",
    "**Start here**",
    "Run `/help` any time you forget what I can do.",
    "Tip: type `/fun` or `/gh` and pick a subcommand from the menu.",
    "",
    "**Privacy option**",
    "Many commands support `private:true` to only show the result to you.",
    "",
    "**Topics**",
    "Use `/help topic:<topic>`",
    `overview, fun, github, summary, timezone${isAdmin ? ", admin" : ""}, commands`,
    "",
    "**Quick picks**",
    "`/fun joke random`  Random joke",
    "`/fun poll`         Create a quick poll",
    "`/fun coinflip`     Flip a coin",
    "`/gh status`        Check GitHub integration status",
    "`/summary`          Summarize recent messages",
    "",
    "If new commands don't show up, an admin may need to run the register script.",
  ].join("\n");
}

function buildFunHelp(): string {
  return [
    "**Help: Fun**",
    "",
    "All fun commands live under `/fun`.",
    "Most support `private:true` to only show the result to you.",
    "",
    "**Games**",
    "`/fun dice`           Roll dice (2-100 sides, 1-10 dice)",
    "`/fun coinflip`       Flip a coin",
    "`/fun poll`           Create a poll (2-4 options)",
    "",
    "**Jokes**",
    "`/fun joke random`    Random joke (optional category filter)",
    "`/fun joke add`       Add a joke to the database",
    "`/fun joke list`      Browse recent jokes",
    "`/fun joke remove`    Remove a joke (moderators)",
    "",
    "**Stats & Info**",
    "`/fun coinflipstats`  Coin flip stats (you or another user)",
    "`/fun leaderboard`    Fun command usage leaderboard",
    "`/fun weather`        Current weather for a location",
    "",
    "**Utility**",
    "`/fun remind`         Remind you in X minutes",
  ].join("\n");
}

function buildGitHubHelp(): string {
  return [
    "**Help: GitHub**",
    "",
    "`/gh issue`     Fetch a GitHub issue",
    "`/gh issues`    List open issues",
    "`/gh prs`       List open pull requests",
    "`/gh status`    Show integration status",
    "",
    "If `/gh status` shows errors, check `.env` and setup docs.",
  ].join("\n");
}

function buildSummaryHelp(): string {
  return [
    "**Help: Summary & History**",
    "",
    "`/summary`    Summarize recent messages",
    "`/history`    DM recent channel history",
    "`/playback`   Page through messages",
    "`/pagination` Demo pagination helper",
  ].join("\n");
}

function buildTimezoneHelp(): string {
  return [
    "**Help: Timezone**",
    "",
    "Timezone commands support a `private` modifier for reply visibility.",
    "Default behavior:",
    "- `/timezone set` and `/timezone clear` default to private",
    "- `/timezone show`, `/timezone compare`, `/timezone convert` default to public",
    "",
    "**Commands**",
    "`/timezone set zone:<zone> [guild:true] [private:true]`",
    "`/timezone show [guild:true] [private:true]`",
    "`/timezone clear [guild:true] [private:true]`",
    "`/timezone compare user:<user> [guild:true] [private:true]`",
    "`/timezone convert time:<time> to:<zone> [from:<zone>] [guild:true] [private:true]`",
    "",
    "**Examples**",
    '`/timezone set zone:"US Eastern"`',
    "`/timezone show private:true`",
    "`/timezone compare user:@Nick private:false`",
    '`/timezone convert time:"7:30pm" to:PT private:false`',
  ].join("\n");
}

function buildAdminHelp(args: { isAdmin: boolean }): string {
  if (!args.isAdmin) {
    return [
      "**Help: Admin**",
      "",
      "You do not have Manage Server permissions.",
      "Ask an admin to configure server options.",
    ].join("\n");
  }

  return [
    "**Help: Admin**",
    "",
    "**Server Configuration**",
    "`/config welcome-channel set`    Set welcome channel",
    "`/config welcome-channel clear`  Remove welcome channel",
    "",
    "**Role-Based Moderation**",
    "`/admin timeout`   Timeout a user (requires role)",
    "`/admin kick`      Kick a user (requires role)",
    "`/admin ban`       Ban a user (requires role)",
    "",
    "You need Manage Server permissions to run these.",
    "Moderation commands require specific roles set by server config.",
  ].join("\n");
}

function buildCommandsHelp(args: {
  isAdmin: boolean;
  commands: CommandListItem[];
}): string {
  const visible = args.commands.filter((c) => (args.isAdmin ? true : !c.adminOnly));

  if (!visible.length) {
    return [
      "**Help: Commands**",
      "",
      "No commands found.",
      "If this seems wrong, check the command loader and build output.",
    ].join("\n");
  }

  visible.sort((a, b) => {
    const g = a.group.localeCompare(b.group);
    return g !== 0 ? g : a.name.localeCompare(b.name);
  });

  const lines: string[] = ["**Help: Commands**", ""];

  let currentGroup: string | null = null;

  for (const cmd of visible) {
    const group = titleCase(cmd.group);
    if (group !== currentGroup) {
      currentGroup = group;
      lines.push("");
      lines.push(`**${group}**`);
    }

    lines.push(`/${cmd.name}${cmd.description ? `  ${cmd.description}` : ""}`);
  }

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */

function titleCase(s: string): string {
  if (!s) return "Other";
  return s
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
