// src/commands/fun/subcommands/leaderboard.ts

import { EmbedBuilder, type CommandInteraction, type User } from "discord.js";
import { getFunUsageSnapshot } from "../../../services/fun/funUsageStore.js";
import { logger } from "../../../utils/logger.js";

export type LeaderboardMode =
  | { kind: "users"; limit: number }
  | { kind: "commands"; limit: number }
  | { kind: "user"; userId: string };

type PerCommandCounts = Record<string, number>;
type PerUserByCommand = Record<string, PerCommandCounts>;

function toCount(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function topCommandsFromMap(
  perCmd: PerCommandCounts | undefined,
  limit: number,
): Array<{ command: string; count: number }> {
  if (!perCmd) return [];

  return Object.entries(perCmd)
    .map(([command, raw]) => ({ command, count: toCount(raw) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function formatInlineBreakdown(
  perCmd: PerCommandCounts | undefined,
  limit: number,
): string {
  const top = topCommandsFromMap(perCmd, limit);
  if (!top.length) return "";

  // Example: "leaderboard 10x, coinflip 4x, chucknorris 2x"
  return top.map((x) => `${x.command} ${x.count}x`).join(", ");
}

async function safeFetchUser(
  interaction: CommandInteraction,
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
  interaction: CommandInteraction,
  mode: LeaderboardMode,
): Promise<void> {
  const snapshot = await getFunUsageSnapshot();

  // Snapshot shapes can drift if a file is edited manually, so we defensive-cast.
  const totalsByUser = (snapshot.totalsByUser ?? {}) as Record<string, unknown>;
  const totalsByCommand = (snapshot.totalsByCommand ?? {}) as Record<string, unknown>;
  const byUserByCommand = (snapshot.byUserByCommand ?? {}) as PerUserByCommand;

  const anyUserUsage = Object.keys(totalsByUser).length > 0;
  const anyCommandUsage = (Object.values(totalsByCommand) as unknown[]).some(
    (n) => toCount(n) > 0,
  );
  const anyUsage = anyUserUsage || anyCommandUsage;

  const embed = new EmbedBuilder().setFooter({
    text: `Updated: ${snapshot.updatedAt}`,
  });

  if (!anyUsage) {
    embed.setTitle("Fun Leaderboard");
    embed.setDescription(
      "No fun command usage recorded yet. Try `/fun dadjoke` to get started.",
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (mode.kind === "commands") {
    const items = (Object.entries(totalsByCommand) as Array<[string, unknown]>)
      .map(([cmd, raw]) => ({ cmd, count: toCount(raw) }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, mode.limit);

    embed.setTitle("Fun Leaderboard: Top Commands");

    if (!items.length) {
      embed.setDescription("No command usage yet.");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // No numbering, no dashes
    const lines = items.map((x) => `• \`/fun ${x.cmd}\` ${x.count}x`);
    embed.setDescription(lines.join("\n"));
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (mode.kind === "user") {
    const total = toCount(totalsByUser[mode.userId]);
    const perCmd = byUserByCommand[mode.userId] ?? {};

    const u = await safeFetchUser(interaction, mode.userId);
    const displayName = u?.username ?? `User ${mode.userId}`;

    embed.setTitle(`Fun Usage: ${displayName}`);

    const top = topCommandsFromMap(perCmd, 25);
    const commandLines = top.length
      ? top.map((x) => `• \`/fun ${x.command}\` ${x.count}x`)
      : ["• No per-command data yet."];

    embed.setDescription([`Total uses: ${total}x`, "", ...commandLines].join("\n"));
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Top users (default)
  const userItems = (Object.entries(totalsByUser) as Array<[string, unknown]>)
    .map(([userId, raw]) => ({ userId, total: toCount(raw) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, mode.limit);

  embed.setTitle("Fun Leaderboard: Top Users");

  if (!userItems.length) {
    embed.setDescription("No user usage yet.");
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Show “user X ran fun command Y this many times”
  // No emojis, no numbering, no dash separators
  const lines: string[] = [];

  for (const item of userItems) {
    const perCmd = byUserByCommand[item.userId] ?? {};
    const breakdown = formatInlineBreakdown(perCmd, 3);

    if (breakdown) {
      lines.push(`• <@${item.userId}> ${item.total}x (top: ${breakdown})`);
    } else {
      lines.push(`• <@${item.userId}> ${item.total}x`);
    }
  }

  embed.setDescription(lines.join("\n"));
  await interaction.editReply({ embeds: [embed] });
}
