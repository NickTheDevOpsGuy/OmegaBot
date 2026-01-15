// src/commands/fun/subcommands/leaderboard.ts

import { EmbedBuilder, type ChatInputCommandInteraction, type User } from "discord.js";
import {
  getFunUsageSnapshot,
  type FunCommandKey,
} from "../../../services/fun/funUsageStore.js";
import { logger } from "../../../utils/logger.js";

export type LeaderboardMode =
  | { kind: "users"; limit: number }
  | { kind: "commands"; limit: number }
  | { kind: "user"; userId: string };

type PerUserByCommand = Record<string, Record<string, number>>;

function isFunCommandKey(value: string): value is FunCommandKey {
  const allowed: ReadonlySet<string> = new Set([
    "chucknorris",
    "dadjoke",
    "dice",
    "coinflip",
    "java",
    "poll",
    "weather",
    "weather7",
    "leaderboard",
  ]);
  return allowed.has(value);
}

function formatCount(n: number): string {
  return `${n}x`;
}

function getPerCmd(
  byUserByCommand: PerUserByCommand | undefined,
  userId: string,
): Record<FunCommandKey, number> {
  const raw = (byUserByCommand ?? {})[userId] ?? {};
  const out: Partial<Record<FunCommandKey, number>> = {};

  for (const [k, v] of Object.entries(raw)) {
    if (!isFunCommandKey(k)) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) continue;
    out[k] = v;
  }

  return out as Record<FunCommandKey, number>;
}

function formatTopCommandsInline(
  perCmd: Record<FunCommandKey, number>,
  maxItems: number,
): string {
  const parts = (Object.entries(perCmd) as Array<[FunCommandKey, number]>)
    .filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([cmd, n]) => `${cmd} ${formatCount(n)}`);

  return parts.length ? parts.join(", ") : "";
}

function formatUserBreakdownLines(
  perCmd: Record<FunCommandKey, number>,
  maxItems: number,
): string[] {
  return (Object.entries(perCmd) as Array<[FunCommandKey, number]>)
    .filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([cmd, n]) => `• \`/fun ${cmd}\` ${formatCount(n)}`);
}

async function safeFetchUser(
  interaction: ChatInputCommandInteraction,
  userId: string,
): Promise<User | null> {
  try {
    return await interaction.client.users.fetch(userId);
  } catch (err) {
    logger.debug({ err, userId }, "[fun/leaderboard] failed to fetch user");
    return null;
  }
}

export async function run(
  interaction: ChatInputCommandInteraction,
  mode: LeaderboardMode,
): Promise<void> {
  const snapshot = await getFunUsageSnapshot();

  const embed = new EmbedBuilder().setFooter({
    text: `Updated: ${snapshot.updatedAt}`,
  });

  const totalsByUser = snapshot.totalsByUser ?? {};
  const totalsByCommand = snapshot.totalsByCommand ?? {};
  const byUserByCommand = snapshot.byUserByCommand ?? {};

  const anyUsage =
    Object.keys(totalsByUser).length > 0 ||
    Object.values(totalsByCommand).some(
      (n) => typeof n === "number" && Number.isFinite(n) && n > 0,
    );

  if (!anyUsage) {
    embed.setTitle("🎉 Fun Leaderboard");
    embed.setDescription(
      "No fun command usage recorded yet.\n\nTry running `/fun dadjoke` or `/fun coinflip` to get started.",
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Top commands
  if (mode.kind === "commands") {
    const items = (Object.entries(totalsByCommand) as Array<[string, number]>)
      .filter(([k, n]) => isFunCommandKey(k) && typeof n === "number" && n > 0)
      .map(([k, n]) => [k as FunCommandKey, n] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, mode.limit);

    embed.setTitle("🎉 Fun Leaderboard: Top Commands");

    const lines = items.map(([cmd, count]) => `• \`/fun ${cmd}\` ${formatCount(count)}`);
    embed.setDescription(lines.length ? lines.join("\n") : "No command usage yet.");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Single-user view
  if (mode.kind === "user") {
    const userId = mode.userId;
    const total = totalsByUser[userId] ?? 0;
    const perCmd = getPerCmd(byUserByCommand, userId);

    const u = await safeFetchUser(interaction, userId);
    const titleName = u?.username ?? `User ${userId}`;

    embed.setTitle(`👤 Fun Usage: ${titleName}`);

    // Per your request: no avatar thumbnail in this view
    // (keep it clean and consistent)

    const lines: string[] = [];
    lines.push(`Total: **${formatCount(total)}**`);

    const breakdownLines = formatUserBreakdownLines(perCmd, 25);
    if (breakdownLines.length) {
      lines.push("");
      lines.push(...breakdownLines);
    } else {
      lines.push("");
      lines.push("No per-command breakdown yet. Run a few `/fun` commands!");
    }

    embed.setDescription(lines.join("\n"));

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Top users (default)
  const userItems = Object.entries(totalsByUser)
    .filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, mode.limit);

  embed.setTitle("🏆 Fun Leaderboard: Top Users");

  const lines = userItems.map(([userId, total]) => {
    const perCmd = getPerCmd(byUserByCommand, userId);
    const top = formatTopCommandsInline(perCmd, 3);

    // No numbers, no "—"
    // Show exactly what you wanted: user X ran command Y this many times
    const detail = top ? ` (${top})` : "";
    return `• <@${userId}> ${formatCount(total)}${detail}`;
  });

  embed.setDescription(lines.length ? lines.join("\n") : "No user usage yet.");

  await interaction.editReply({ embeds: [embed] });
}
