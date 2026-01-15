// src/commands/fun/subcommands/leaderboard.ts

import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type User,
} from "discord.js";
import { getFunUsageSnapshot } from "../../../services/fun/funUsageStore.js";
import { logger } from "../../../utils/logger.js";

export type LeaderboardMode =
  | { kind: "users"; limit: number }
  | { kind: "commands"; limit: number }
  | { kind: "user"; userId: string };

type PerCommandCounts = Record<string, number>;
type ByUserByCommand = Record<string, PerCommandCounts>;

function toCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function clampLimit(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function topFromPerCmd(
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

function formatPerCmdInline(perCmd: PerCommandCounts | undefined, limit: number): string {
  const top = topFromPerCmd(perCmd, limit);
  if (!top.length) return "";
  // Example: "dadjoke 3x, coinflip 2x, chucknorris 1x"
  return top.map((x) => `${x.command} ${x.count}x`).join(", ");
}

function formatPerCmdLines(perCmd: PerCommandCounts | undefined): string[] {
  const top = topFromPerCmd(perCmd, 50);
  if (!top.length) return ["• No per-command data yet."];

  return top.map((x) => `• \`/fun ${x.command}\` ${x.count}x`);
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

  // Defensive casts (JSON file can drift)
  const totalsByUserRaw = (snapshot as unknown as { totalsByUser?: unknown }).totalsByUser;
  const totalsByCommandRaw = (snapshot as unknown as { totalsByCommand?: unknown })
    .totalsByCommand;
  const byUserByCommandRaw = (snapshot as unknown as { byUserByCommand?: unknown })
    .byUserByCommand;

  const totalsByUser = (totalsByUserRaw ?? {}) as Record<string, unknown>;
  const totalsByCommand = (totalsByCommandRaw ?? {}) as Record<string, unknown>;
  const byUserByCommand = (byUserByCommandRaw ?? {}) as ByUserByCommand;

  const anyUserUsage = Object.keys(totalsByUser).length > 0;
  const anyCommandUsage = (Object.values(totalsByCommand) as unknown[]).some(
    (n) => toCount(n) > 0,
  );

  const updatedAt = (snapshot as unknown as { updatedAt?: string }).updatedAt ?? "unknown";

  const embed = new EmbedBuilder().setFooter({ text: `Updated: ${updatedAt}` });

  if (!anyUserUsage && !anyCommandUsage) {
    embed.setTitle("Fun Leaderboard");
    embed.setDescription("No fun command usage recorded yet. Try `/fun dadjoke` to get started.");
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const limit = clampLimit("limit" in mode ? mode.limit : 10, 1, 25);

  // ---- Top Commands view ----
  if (mode.kind === "commands") {
    const items = (Object.entries(totalsByCommand) as Array<[string, unknown]>)
      .map(([cmd, raw]) => ({ cmd, count: toCount(raw) }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    embed.setTitle("Fun Leaderboard: Top Commands");

    if (!items.length) {
      embed.setDescription("No command usage yet.");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // No emojis, no numbering, no dash separators
    embed.setDescription(items.map((x) => `• \`/fun ${x.cmd}\` ${x.count}x`).join("\n"));
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ---- Single User view (avatar + top command) ----
  if (mode.kind === "user") {
    const userId = mode.userId;

    const total = toCount(totalsByUser[userId]);
    const perCmd = byUserByCommand[userId] ?? {};

    const user = await safeFetchUser(interaction, userId);
    const name = user?.username ?? `User ${userId}`;
    const avatar = user?.displayAvatarURL() ?? null;

    embed.setTitle(`Fun Usage: ${name}`);
    if (avatar) embed.setThumbnail(avatar);

    const top1 = topFromPerCmd(perCmd, 1)[0] ?? null;
    const topLine = top1 ? `Top command: \`/fun ${top1.command}\` ${top1.count}x` : "";

    const lines = formatPerCmdLines(perCmd);

    // No left emojis, no numbering, no dash separators
    embed.setDescription(
      [
        `User: <@${userId}>`,
        `Total uses: ${total}x`,
        topLine,
        "",
        "Per-command breakdown:",
        ...lines,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ---- Top Users (default) ----
  const userItems = (Object.entries(totalsByUser) as Array<[string, unknown]>)
    .map(([userId, raw]) => ({ userId, total: toCount(raw) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  embed.setTitle("Fun Leaderboard: Top Users");

  if (!userItems.length) {
    embed.setDescription("No user usage yet.");
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // “user X ran command Y this many times”
  // No emojis, no numbering, no dash separators
  const out: string[] = [];

  for (const item of userItems) {
    const perCmd = byUserByCommand[item.userId] ?? {};
    const breakdown = formatPerCmdInline(perCmd, 3);

    if (breakdown) {
      out.push(`• <@${item.userId}> ${item.total}x (${breakdown})`);
    } else {
      out.push(`• <@${item.userId}> ${item.total}x`);
    }
  }

  embed.setDescription(out.join("\n"));
  await interaction.editReply({ embeds: [embed] });
}