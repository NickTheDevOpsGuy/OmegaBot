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
  lines.push("- Try `/help` any time you forget what I can do");
  lines.push("");

  lines.push("**Onboarding**");
  lines.push("- Welcome messages are posted when someone joins");
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
  const pretty = formatCommandList(commands, { isAdmin });

  if (pretty.length) {
    lines.push("**Commands**");
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