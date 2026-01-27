// src/commands/help/helpText.ts
//
// Help text for the /help command. Organized by topic to stay under Discord's
// message limits while providing comprehensive documentation.

import type { CommandListItem } from "../../services/discord/commandMeta.js";

export type HelpTopic =
  | "overview"
  | "fun"
  | "games"
  | "profile"
  | "github"
  | "admin"
  | "commands";

/**
 * Builds help text for the specified topic.
 *
 * @param isAdmin - Whether the user has admin permissions
 * @param commands - List of registered commands
 * @param topic - The help topic to display
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
    case "games":
      return buildGamesHelp();
    case "profile":
      return buildProfileHelp();
    case "github":
      return buildGitHubHelp();
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
/* Overview                                                                    */
/* -------------------------------------------------------------------------- */

function buildOverviewHelp(args: { isAdmin: boolean }): string {
  const { isAdmin } = args;

  return [
    "**OmegaBot Help**",
    "",
    "**Getting Started**",
    "Type `/` and pick a command from the menu.",
    "Most commands support `private:true` to only show results to you.",
    "",
    "**Topics**",
    "Use `/help topic:<topic>` for detailed help:",
    `\`overview\`, \`fun\`, \`games\`, \`profile\`${isAdmin ? ", `admin`" : ""}, \`commands\``,
    "",
    "**Quick Commands**",
    "`/fun daily`       Daily check-in for points",
    "`/fun trivia`      Answer trivia questions",
    "`/fun slots`       Spin the slot machine",
    "`/profile view`    See your stats & achievements",
    "`/info user`       Look up user info",
    "`/achievements`    View unlockable achievements",
    "",
    "**Popular Games**",
    "`/fun blackjack`   Play blackjack",
    "`/fun wordle`      Daily word puzzle",
    "`/fun hangman`     Guess the word",
    "`/fun rps @user`   Challenge to Rock Paper Scissors",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Fun Commands                                                                */
/* -------------------------------------------------------------------------- */

function buildFunHelp(): string {
  return [
    "**Help: Fun Commands**",
    "",
    "All fun commands are under `/fun`. Use `/help topic:games` for game details.",
    "",
    "**Daily & Stats**",
    "`/fun daily`          Check in for points & streaks",
    "`/fun stats`          View all your game stats",
    "`/fun leaderboard`    See top players",
    "",
    "**Quotes & Jokes**",
    "`/fun quote add`      Save a memorable quote",
    "`/fun quote random`   Get a random quote",
    "`/fun joke random`    Get a random joke",
    "`/fun joke add`       Add a joke",
    "",
    "**Reminders**",
    "`/fun remind set`     Set a reminder (5m, 1h, 1d)",
    "`/fun remind list`    View pending reminders",
    "`/fun remind cancel`  Cancel a reminder",
    "",
    "**Utility**",
    "`/fun weather`        Current weather",
    "`/fun weather7`       7-day forecast",
    "`/fun fact`           Random interesting fact",
    "`/fun poll`           Create a poll",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Games                                                                       */
/* -------------------------------------------------------------------------- */

function buildGamesHelp(): string {
  return [
    "**Help: Games**",
    "",
    "OmegaBot has 13 games! Most track stats and have achievements.",
    "",
    "**Solo Games**",
    "`/fun 8ball`          Ask the magic 8-ball",
    "`/fun trivia`         Trivia with points & streaks",
    "`/fun blackjack`      Blackjack vs dealer",
    "`/fun hangman`        Guess the word",
    "`/fun wordle`         Daily word puzzle",
    "`/fun slots`          Slot machine (jackpots!)",
    "`/fun coinflip`       Heads or tails",
    "`/fun dice`           Roll dice",
    "",
    "**PvP Games**",
    "`/fun rps opponent:@user`       Rock Paper Scissors",
    "`/fun tictactoe opponent:@user` Tic Tac Toe",
    "`/fun connect4 user:@user`      Connect 4",
    "",
    "**Other**",
    "`/fun would-you-rather`   Vote on WYR questions",
    "",
    "**View Stats**",
    "Most games support `stats:true` to see your record.",
    "Example: `/fun blackjack stats:true`",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

function buildProfileHelp(): string {
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
    "`/info avatar`     View avatars",
    "`/achievements`    View unlocked achievements",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* GitHub                                                                      */
/* -------------------------------------------------------------------------- */

function buildGitHubHelp(): string {
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

/* -------------------------------------------------------------------------- */
/* Admin                                                                       */
/* -------------------------------------------------------------------------- */

function buildAdminHelp(args: { isAdmin: boolean }): string {
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

/* -------------------------------------------------------------------------- */
/* Commands List                                                               */
/* -------------------------------------------------------------------------- */

function buildCommandsHelp(args: {
  isAdmin: boolean;
  commands: CommandListItem[];
}): string {
  const visible = args.commands.filter((c) => (args.isAdmin ? true : !c.adminOnly));

  if (!visible.length) {
    return [
      "**Help: Commands**",
      "",
      "No commands found. Check the command loader.",
    ].join("\n");
  }

  // Sort by group, then name
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
    lines.push(`\`/${cmd.name}\` ${cmd.description || ""}`);
  }

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                   */
/* -------------------------------------------------------------------------- */

function titleCase(s: string): string {
  if (!s) return "Other";
  return s
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
