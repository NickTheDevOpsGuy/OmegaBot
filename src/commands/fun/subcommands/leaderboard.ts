// src/commands/fun/subcommands/leaderboard.ts

import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type User,
} from "discord.js";
import {
  getFunUsageSnapshot,
  type FunCommandKey,
} from "../../../services/fun/funUsageStore.js";
import { logger } from "../../../utils/logger.js";

export type LeaderboardMode =
  | { kind: "users"; limit: number }
  | { kind: "commands"; limit: number }
  | { kind: "user"; userId: string };

type PerCommandCounts = Record<string, number>;

/**
 * Convert a per-user command map into a clean, non-ranking usage list.
 * Example:
 * /fun coinflip — 4
 * /fun java — 1
 */
function formatUserUsageLines(perCmd: PerCommandCounts | undefined): string[] {
  if (!perCmd) return [];

  return Object.entries(perCmd)
    .filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cmd, count]) => `/fun ${cmd} — **${count}**`);
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

function isAnyUsage(snapshot: {
  totalsByUser?: Record<string, number>;
  totalsByCommand?: Record<string, number>;
  byUserByCommand?: Record<string, Record<string, number>>;
}): boolean {
  const byUser = snapshot.totalsByUser ?? {};
  const byCmd = snapshot.totalsByCommand ?? {};
  const perUser = snapshot.byUserByCommand ?? {};

  return (
    Object.keys(byUser).length > 0 ||
    Object.values(byCmd).some((n) => typeof n === "number" && n > 0) ||
    Object.keys(perUser).length > 0
  );
}

export async function run(
  interaction: ChatInputCommandInteraction,
  mode: LeaderboardMode,
): Promise<void> {
  const snapshot = await getFunUsageSnapshot();

  const updatedAt =
    typeof snapshot.updatedAt === "string" ? snapshot.updatedAt : "unknown";

  const embed = new EmbedBuilder().setFooter({ text: `Updated: ${updatedAt}` });

  if (!isAnyUsage(snapshot)) {
    embed.setTitle("Fun Leaderboard");
    embed.setDescription("No fun command usage recorded yet.");
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ------------------------------------------------------------
  // View: Top commands
  // ------------------------------------------------------------
  if (mode.kind === "commands") {
    const totals = snapshot.totalsByCommand ?? {};
    const items = (Object.entries(totals) as Array<[string, number]>)
      .filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, mode.limit);

    embed.setTitle("Fun Leaderboard: Top Commands");

    const lines = items.map(([cmd, count]) => `/fun ${cmd} — **${count}**`);
    embed.setDescription(lines.length ? lines.join("\n") : "No command usage yet.");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ------------------------------------------------------------
  // View: Single user usage (includes avatar thumbnail)
  // ------------------------------------------------------------
  if (mode.kind === "user") {
    const totalsByUser = snapshot.totalsByUser ?? {};
    const total = totalsByUser[mode.userId] ?? 0;

    const perCmd =
      (snapshot.byUserByCommand?.[mode.userId] as Record<string, number> | undefined) ??
      undefined;

    const u = await safeFetchUser(interaction, mode.userId);
    const titleName = u?.username ?? `User ${mode.userId}`;
    const avatarUrl = u?.displayAvatarURL() ?? null;

    embed.setTitle(`Fun Usage: ${titleName}`);
    if (avatarUrl) embed.setThumbnail(avatarUrl);

    const lines = formatUserUsageLines(perCmd);

    // Flat list, no ranks/medals
    embed.setDescription(
      [
        `Total uses: **${total}**`,
        "",
        ...(lines.length ? lines : ["No per-command usage recorded yet."]),
      ].join("\n"),
    );

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ------------------------------------------------------------
  // View: Top users (no avatars, no ranking semantics)
  // ------------------------------------------------------------
  const totalsByUser = snapshot.totalsByUser ?? {};
  const userItems = Object.entries(totalsByUser)
    .filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, mode.limit);

  embed.setTitle("Fun Leaderboard: Top Users");

  // Flat list, no 1/2/3 medals or ranks
  const lines = userItems.map(([userId, total]) => `<@${userId}> — **${total}**`);
  embed.setDescription(lines.length ? lines.join("\n") : "No user usage yet.");

  await interaction.editReply({ embeds: [embed] });
}