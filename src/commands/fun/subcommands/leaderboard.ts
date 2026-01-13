// src/commands/fun/subcommands/leaderboard.ts

import type { ChatInputCommandInteraction, User } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getFunUsageSnapshot } from "../funUsageStore.js";

export type LeaderboardMode =
  | { kind: "users"; limit: number }
  | { kind: "commands"; limit: number }
  | { kind: "user"; userId: string };

type RankedItem = { key: string; count: number };

function rank(map: Record<string, number>, limit: number): RankedItem[] {
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function medals(idx: number): string {
  if (idx === 0) return "🥇";
  if (idx === 1) return "🥈";
  if (idx === 2) return "🥉";
  return `${idx + 1}.`;
}

async function safeFetchUser(
  interaction: ChatInputCommandInteraction,
  userId: string,
): Promise<User | null> {
  try {
    return await interaction.client.users.fetch(userId);
  } catch {
    return null;
  }
}

function prettyCommandName(cmd: string): string {
  // Keep it simple and readable in output
  return cmd.startsWith("fun ") ? cmd : `fun ${cmd}`;
}

export async function run(
  interaction: ChatInputCommandInteraction,
  mode: LeaderboardMode,
): Promise<void> {
  const snapshot = await getFunUsageSnapshot();

  const totalEvents = Object.values(snapshot.totalsByCommand).reduce(
    (sum: number, n: number) => sum + n,
    0,
  );

  if (totalEvents === 0) {
    await interaction.editReply(
      [`Updated: ${snapshot.updatedAt}`, "", "No fun command usage recorded yet."].join(
        "\n",
      ),
    );
    return;
  }

  if (mode.kind === "commands") {
    const top = rank(snapshot.totalsByCommand, mode.limit);

    const lines: string[] = [];
    for (let i = 0; i < top.length; i += 1) {
      const item = top[i]!;
      lines.push(`${medals(i)} \`/${prettyCommandName(item.key)}\` — **${item.count}**`);
    }

    const embed = new EmbedBuilder()
      .setTitle("🎉 Fun Leaderboard: Top Commands")
      .setDescription(lines.join("\n"))
      .setFooter({ text: `Updated: ${snapshot.updatedAt}` });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (mode.kind === "users") {
    const top = rank(snapshot.totalsByUser, mode.limit);

    const lines: string[] = [];
    for (let i = 0; i < top.length; i += 1) {
      const item = top[i]!;
      lines.push(`${medals(i)} <@${item.key}> — **${item.count}**`);
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 Fun Leaderboard: Top Users")
      .setDescription(lines.join("\n"))
      .setFooter({ text: `Updated: ${snapshot.updatedAt}` });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // mode.kind === "user"
  const userId = mode.userId;
  const user = await safeFetchUser(interaction, userId);

  const perCmd = snapshot.byUserByCommand[userId] ?? {};
  const sorted = rank(perCmd, 25);

  const lines: string[] = [];
  if (sorted.length === 0) {
    lines.push("No recorded fun commands for this user yet.");
  } else {
    for (let i = 0; i < sorted.length; i += 1) {
      const item = sorted[i]!;
      lines.push(`${medals(i)} \`/${prettyCommandName(item.key)}\` — **${item.count}**`);
    }
  }

  const titleName = user?.username ? `${user.username}` : `User ${userId}`;
  const embed = new EmbedBuilder()
    .setTitle(`👤 Fun Usage: ${titleName}`)
    .setDescription(lines.join("\n"))
    .setFooter({ text: `Updated: ${snapshot.updatedAt}` });

  if (user) {
    embed.setThumbnail(user.displayAvatarURL({ size: 128 }));
  }

  await interaction.editReply({ embeds: [embed] });
}
