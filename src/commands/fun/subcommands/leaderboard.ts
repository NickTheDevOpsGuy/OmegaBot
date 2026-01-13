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

type Breakdown = Record<FunCommandKey, number>;

function formatBreakdown(b: Breakdown | undefined, maxItems: number): string {
  if (!b) return "";

  const parts = (Object.entries(b) as Array<[FunCommandKey, number]>)
    .filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort((a, c) => c[1] - a[1])
    .slice(0, maxItems)
    .map(([k, n]) => `${n}x ${k}`);

  return parts.length ? parts.join(", ") : "";
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
  const store = await getFunUsageSnapshot();

  const embed = new EmbedBuilder().setFooter({
    text: `Updated: ${store.updatedAt}`,
  });

  const anyUsage =
    Object.keys(store.totalsByUser).length > 0 ||
    Object.values(store.totalsByCommand).some((n) => n > 0);

  if (!anyUsage) {
    embed.setTitle("🏆 Fun Leaderboard");
    embed.setDescription("No fun command usage recorded yet.");
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (mode.kind === "commands") {
    const items = (
      Object.entries(store.totalsByCommand) as Array<[FunCommandKey, number]>
    )
      .filter(([, n]) => n > 0)
      .sort((a, c) => c[1] - a[1])
      .slice(0, mode.limit);

    embed.setTitle("🎉 Fun Leaderboard: Top Commands");

    const lines = items.map(([cmd, count], idx) => {
      const rank = idx + 1;
      return `${rank}. \`${cmd}\` — **${count}**`;
    });

    embed.setDescription(lines.length ? lines.join("\n") : "No command usage yet.");
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (mode.kind === "user") {
    const total = store.totalsByUser[mode.userId] ?? 0;
    const breakdown = store.breakdownByUser[mode.userId];

    const u = await safeFetchUser(interaction, mode.userId);
    const display = u ? `${u.username}` : `User ${mode.userId}`;
    const avatarUrl = u?.displayAvatarURL() ?? null;

    embed.setTitle(`👤 Fun Usage: ${display}`);
    if (avatarUrl) embed.setThumbnail(avatarUrl);

    const breakdownText = formatBreakdown(breakdown, 10);
    embed.setDescription(
      [
        `Total uses: **${total}**`,
        breakdownText ? `Breakdown: ${breakdownText}` : "Breakdown: (none yet)",
      ].join("\n"),
    );

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Top users
  const userItems = Object.entries(store.totalsByUser)
    .filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort((a, c) => c[1] - a[1])
    .slice(0, mode.limit);

  embed.setTitle("🏆 Fun Leaderboard: Top Users");

  const users = await Promise.all(
    userItems.map(async ([userId]) => {
      const u = await safeFetchUser(interaction, userId);
      return { userId, user: u };
    }),
  );

  const lines = userItems.map(([userId, total], idx) => {
    const rank = idx + 1;
    const u = users.find((x) => x.userId === userId)?.user ?? null;

    const avatarUrl = u?.displayAvatarURL() ?? null;
    const breakdown = store.breakdownByUser[userId];
    const breakdownText = formatBreakdown(breakdown, 4);

    const avatarPart = avatarUrl ? ` • ${avatarUrl}` : "";
    const breakdownPart = breakdownText ? ` • ${breakdownText}` : "";

    return `${rank}. <@${userId}> — **${total}**${breakdownPart}${avatarPart}`;
  });

  embed.setDescription(lines.length ? lines.join("\n") : "No user usage yet.");
  await interaction.editReply({ embeds: [embed] });
}
