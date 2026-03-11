import type { CommandListItem } from "../../../../../services/discord/discord/commandMeta.js";

function titleCase(s: string): string {
  if (!s) return "Other";
  return s
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function buildCommandsHelp(args: {
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
