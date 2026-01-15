// src/commands/help/helpText.ts

import type { CommandListItem } from "../../services/discord/commandMeta.js";

/**
 * Help text builder for /help.
 *
 * Keep this file focused on presentation so the command handler stays tiny.
 */
export function buildHelpText(args: {
  isAdmin: boolean;
  commands: CommandListItem[];
}): string {
  const { isAdmin, commands } = args;

  const lines: string[] = [];

  lines.push("**OmegaBot Help**");
  lines.push("");

  lines.push("**Start here**");
  lines.push("- Run `/help` any time you forget what I can do");
  lines.push("- Tip: type `/fun` or `/gh` and pick a subcommand from the menu");
  lines.push("");

  lines.push("**Onboarding**");
  lines.push("- Posts a welcome message when someone joins");
  lines.push("");

  lines.push("**Fun**");
  lines.push("- `/fun chucknorris` — Chuck Norris facts (random, category, or search)");
  lines.push("- `/fun dadjoke` — Random dad joke (or search)");
  lines.push("- `/fun coinflip` — Heads or tails");
  lines.push("- `/fun dice` — Roll dice (custom sides/count)");
  lines.push("- `/fun poll` — Create a quick poll (2–4 options)");
  lines.push("- `/fun weather` — Today’s weather for a location");
  lines.push("- `/fun weather7` — 7-day forecast for a location");
  lines.push(
    "- `/fun leaderboard` — Usage stats (top users, top commands, or a single user)",
  );
  lines.push("");

  lines.push("**GitHub**");
  lines.push("- `/gh issue` — Fetch a GitHub issue by number");
  lines.push("- `/gh issues` — List open GitHub issues");
  lines.push("- `/gh prs` — List open pull requests");
  lines.push(
    "- `/gh status` — Show GitHub integration status (config, polling, channels)",
  );
  lines.push("- `/pr` — Fetch a single pull request by number (legacy shortcut)");
  lines.push("");

  lines.push("**Summary & History**");
  lines.push("- `/summary` — Summarize recent messages (local or LLM mode)");
  lines.push("- `/history` — DM recent channel history (file fallback if too long)");
  lines.push("- `/playback` — Page through recent messages using buttons");
  lines.push("- `/pagination` — Demo the reusable pagination helper");
  lines.push("");

  lines.push("**Timezone**");
  lines.push("- `/timezone set` — Save your IANA timezone");
  lines.push("- `/timezone show` — Display your current timezone");
  lines.push("- `/timezone clear` — Remove your saved timezone");
  lines.push("");

  if (isAdmin) {
    lines.push("**Admin config** (Manage Server)");
    lines.push("- `/config welcome-channel set channel:#your-channel`");
    lines.push("- `/config welcome-channel clear`");
    lines.push("");
  } else {
    lines.push("**Admin config**");
    lines.push("- Ask a server admin to run `/config welcome-channel set` if needed");
    lines.push("");
  }

  // Optional dynamic section: list known commands if we can extract them.
  // This is useful as a "sanity list" even if it doesn't include subcommands.
  const pretty = formatCommandList(commands, { isAdmin });

  if (pretty.length) {
    lines.push("**Registered commands**");
    lines.push(...pretty);
    lines.push("");
  }

  lines.push(
    "_Tip: If new commands don’t show up, admins may need to run the register script._",
  );

  return lines.join("\n");
}

function formatCommandList(
  commands: CommandListItem[],
  opts: { isAdmin: boolean },
): string[] {
  if (!commands.length) return [];

  // Group by category and hide admin-only commands from non-admin users.
  const visible = commands.filter((c) => (opts.isAdmin ? true : !c.adminOnly));

  // Keep stable ordering: group then name.
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
      out.push(`- **${currentGroup}**`);
    }

    // Indent commands under group header
    const desc = cmd.description ? `: ${cmd.description}` : "";
    out.push(`  - \`/${cmd.name}\`${desc}`);
  }

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
