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
  | "quotes"
  | "github"
  | "status"
  | "admin"
  | "commands"
  | "changelog"
  | "summary";

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
    case "quotes":
      return buildQuotesHelp();
    case "github":
      return buildGitHubHelp();
    case "status":
      return buildStatusHelp();
    case "admin":
      return buildAdminHelp({ isAdmin });
    case "commands":
      return buildCommandsHelp({ isAdmin, commands });
    case "changelog":
      return buildChangelogHelp();
    case "summary":
      return buildSummaryHelp();
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
    "Profile, info, and achievements default to private; use `private:false` to show in channel.",
    "Most games support `private` to control visibility.",
    "",
    "**Topics**",
    "Use `/help topic:<topic>` for detailed help:",
    `\`overview\`, \`fun\`, \`games\`, \`profile\`, \`quotes\`, \`summary\`, \`status\`${isAdmin ? ", `admin`" : ""}, \`commands\`, \`changelog\``,
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
    "OmegaBot has 14 games! Most track stats and have achievements.",
    "",
    "**Solo Games**",
    "`/fun 8ball`          Ask the magic 8-ball",
    "`/fun trivia`         Trivia with points & streaks",
    "`/fun blackjack`      Blackjack vs dealer",
    "`/fun hangman play`   Guess the word (dropdown letters, pick difficulty)",
    "`/fun wordle`         Daily word puzzle",
    "`/fun slots`          Slot machine (jackpots!)",
    "`/fun darts`          Throw 3 darts (solo or PvP)",
    "`/fun coinflip`       Heads or tails",
    "`/fun dice`           Roll dice",
    "",
    "**PvP Games**",
    "`/fun rps opponent:@user`       Rock Paper Scissors",
    "`/fun tictactoe opponent:@user` Tic Tac Toe",
    "`/fun connect4 user:@user`      Connect 4",
    "`/fun darts opponent:@user`     Darts",
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
    "`/info avatar`     View avatars (size 128–4096, format png/jpg/webp/gif)",
    "`/achievements`    View unlocked achievements",
    "",
    "**Avatar note**",
    "GIF format shows animated avatars; if the user's avatar isn't animated, a static image is returned.",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Quotes                                                                      */
/* -------------------------------------------------------------------------- */

function buildQuotesHelp(): string {
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
/* Service Status                                                             */
/* -------------------------------------------------------------------------- */

function buildStatusHelp(): string {
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

/* -------------------------------------------------------------------------- */
/* Summary & History                                                           */
/* -------------------------------------------------------------------------- */

function buildSummaryHelp(): string {
  return [
    "**Help: Summary & History**",
    "",
    "`/summary`     Get a summary of recent channel messages (DM'd to you)",
    "`/history`     Get raw recent messages (DM'd, no AI)",
    "",
    "**Summary modes** (set in .env):",
    "• `SUMMARY_MODE=local` – Fast, free, basic summarization",
    "• `SUMMARY_MODE=llm` – Higher quality via OpenAI (requires OPENAI_API_KEY)",
    "",
    "Use `private:true` so only you see the command result.",
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
/* Changelog                                                                   */
/* -------------------------------------------------------------------------- */

function buildChangelogHelp(): string {
  return [
    "**OmegaBot Changelog**",
    "",
    "**3.9.7** (2026-02-12)",
    "• Quote list: limit 5/10/25; Quote context menu: bot messages allowed",
    "• Quote autocomplete in DMs: friendly message; Avatar GIF help note",
    "",
    "**3.9.6** (2026-02-12)",
    "• Help topic: quotes; Quote remove autocomplete",
    "• Quote context menu: embed-only messages; Avatar GIF format",
    "• Suggestion: clearer permission errors",
    "",
    "**3.9.5** (2026-02-12)",
    "• Context menu: right-click message → Quote (saves as server quote)",
    "• Info avatar: size & format options; Suggestion uses modal",
    "• Playback & FAQ: private option / ephemeral by default",
    "",
    "**3.9.4** (2026-02-12)",
    "• Context menu: right-click message → Summarize (DMs summary of messages)",
    "• Rate limit metrics: omegabot_rate_limit_hits_total for cooldown hits",
    "• Ephemeral by default: /profile view & /info user now private unless you choose otherwise",
    "",
    "**3.9.3** (2026-02-12)",
    "• Context menus: right-click user → View Profile, View Achievements",
    "• Admin timeout presets, FAQ tag autocomplete, help topic: summary",
    "",
    "**3.9.2** (2026-02-12)",
    "• Slash commands: Help topic choices (games, profile), giveaway & remind autocomplete",
    "",
    "**3.9.0** (2026-02-12)",
    "• Docker & Docker Compose, web admin dashboard, Grafana dashboard",
    "• Circuit breakers for GitHub/Weather/OpenAI, backup verification",
    "• Dev seed script, hot reload (dev:watch), Dependabot, i18n skeleton",
    "",
    "**3.8.0** (2026-02-12)",
    "• Autocomplete: profile timezone, FAQ keys",
    "• Health & metrics: METRICS_PORT enables /health and /metrics (Prometheus)",
    "• Automated backup: npm run db:backup",
    "• Graceful shutdown, migration system, Discord 429 retry",
    "• Clearer error messages for missing env vars",
    "",
    "**3.7.0** (2026-02-12)",
    "• Interaction handling: defer early, try/catch with fallback, reduces 'interaction failed'",
    "• Autocomplete support for slash commands",
    "• Logs `interactionFailedRecovery: true` when recovering from collector/button errors",
    "",
    "**3.5.0** (2026-02-12)",
    "• `/status vercel` – Check Vercel platform status",
    "• `/status supabase` – Check Supabase platform status",
    "• Uses Statuspage API; shows incidents and degraded components",
    "",
    "**3.3.0** (2026-02-10)",
    "• Hangman: dropdown letters (A–M / N–Z), difficulty, words in SQLite, solve-time stats",
    "• Admin words: HANGMAN_ADMIN_ROLE_ID can add/list words",
    "• New achievement: Speed Demon (solve Hangman in ≤60s)",
    "• Changelog in Discord: /help topic:changelog",
    "",
    "**3.2.0** (2026-02-09)",
    "• Longer game timeouts: 1 hour for Blackjack, Hangman, Wordle, RPS; 10 min per move for Connect 4 & Tic Tac Toe",
    "• **Extend time** button: whoever started the game can add more time",
    "• Timeout reminder: Connect 4 & Tic Tac Toe warn 1 min before move timeout",
    "",
    "**3.1.0** (2026-02-09)",
    "• Rate limiting: slots (3s), blackjack (5s), dice (2s), darts (2s), hangman (10s)",
    "• Daily game metrics & timeout reminders (Connect 4, Tic Tac Toe)",
    "• Retry on API errors; better error handling and logging",
    "",
    "**3.0.0** (2026-01-27)",
    "• New games: Hangman, Wordle, Slots; Blackjack, Connect 4, Would You Rather",
    "• 19 achievements, giveaways, starboard, suggestion system",
    "• 15 slash commands (consolidated from 24)",
    "",
    "Full changelog: GitHub repo → CHANGELOG.md",
  ].join("\n");
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
