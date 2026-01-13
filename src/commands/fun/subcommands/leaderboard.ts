// src/commands/fun/subcommands/leaderboard.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import {
  getFunUsageSnapshot,
  type FunCommandKey,
} from "../../../services/fun/funUsageStore.js";
import { logger } from "../../../utils/logger.js";

export type LeaderboardMode =
  | { kind: "users"; limit: number }
  | { kind: "commands"; limit: number }
  | { kind: "user"; userId: string };

type UserRow = {
  userId: string;
  total: number;
};

type CommandRow = {
  command: FunCommandKey;
  total: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function sortDesc<T>(items: T[], getValue: (t: T) => number): T[] {
  return [...items].sort((a, b) => getValue(b) - getValue(a));
}

function formatCmd(cmd: string): string {
  // Make it a little prettier in output
  // weather7 -> weather7, chucknorris -> chucknorris etc
  return cmd;
}

function medal(idx: number): string {
  if (idx === 0) return "🥇";
  if (idx === 1) return "🥈";
  if (idx === 2) return "🥉";
  return "🏅";
}

async function safeFetchUser(
  interaction: ChatInputCommandInteraction,
  userId: string,
): Promise<{ id: string; tag: string; avatarUrl: string } | null> {
  try {
    const u = await interaction.client.users.fetch(userId);
    return {
      id: u.id,
      tag: u.tag,
      avatarUrl: u.displayAvatarURL({ size: 128 }),
    };
  } catch {
    return null;
  }
}

function buildUpdatedLine(updatedAt: string | null): string {
  const ts = updatedAt ?? new Date().toISOString();
  return `Updated: ${ts}`;
}

export async function run(
  interaction: ChatInputCommandInteraction,
  mode: LeaderboardMode,
): Promise<void> {
  try {
    const store = await getFunUsageSnapshot();

    if (!store || Object.keys(store.users ?? {}).length === 0) {
      await interaction.editReply(
        [
          "No fun command usage recorded yet.",
          "",
          buildUpdatedLine(store?.updatedAt ?? null),
        ].join("\n"),
      );
      return;
    }

    if (mode.kind === "users") {
      const limit = clamp(mode.limit, 1, 25);

      const rows: UserRow[] = Object.entries(store.users).map(([userId, stats]) => ({
        userId,
        total: stats.total ?? 0,
      }));

      const top = sortDesc(rows, (r) => r.total).slice(0, limit);

      const lines: string[] = [];
      for (let i = 0; i < top.length; i += 1) {
        const row = top[i];
        const u = await safeFetchUser(interaction, row.userId);
        const mention = `<@${row.userId}>`;

        // Avatar: we cannot show inline images per line, but we can include a clickable link.
        const avatarLink = u?.avatarUrl ? `[avatar](${u.avatarUrl})` : "";

        lines.push(`${medal(i)} ${mention} — **${row.total}** ${avatarLink}`.trim());
      }

      const embed = new EmbedBuilder()
        .setTitle("🏆 Fun Leaderboard: Top Users")
        .setDescription(lines.join("\n"))
        .setFooter({ text: buildUpdatedLine(store.updatedAt) });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (mode.kind === "commands") {
      const limit = clamp(mode.limit, 1, 25);

      const totals = store.totals ?? {};
      const rows: CommandRow[] = Object.entries(totals).map(([k, v]) => ({
        command: k as FunCommandKey,
        total: v ?? 0,
      }));

      const top = sortDesc(rows, (r) => r.total).slice(0, limit);

      const lines = top.map(
        (r, idx) => `${medal(idx)} \`${formatCmd(r.command)}\` — **${r.total}**`,
      );

      const embed = new EmbedBuilder()
        .setTitle("🏆 Fun Leaderboard: Top Commands")
        .setDescription(lines.join("\n"))
        .setFooter({ text: buildUpdatedLine(store.updatedAt) });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Single user view
    if (mode.kind === "user") {
      const userId = mode.userId;
      const stats = store.users[userId];

      if (!stats) {
        await interaction.editReply(`No fun usage found for <@${userId}> yet.`);
        return;
      }

      const u = await safeFetchUser(interaction, userId);
      const mention = `<@${userId}>`;

      // Build breakdown lines: "chucknorris x2"
      const entries = Object.entries(stats.commands ?? {}) as Array<
        [FunCommandKey, number]
      >;
      const sorted = sortDesc(entries, (e) => e[1]);

      const breakdown =
        sorted.length === 0
          ? ["No per-command breakdown recorded yet."]
          : sorted.map(([cmd, count]) => `• \`${formatCmd(cmd)}\` x**${count}**`);

      const embed = new EmbedBuilder()
        .setTitle("📊 Fun Usage: User Breakdown")
        .setDescription(
          [`${mention} — **${stats.total}** total`, "", ...breakdown].join("\n"),
        )
        .setFooter({ text: buildUpdatedLine(stats.updatedAt ?? store.updatedAt) });

      if (u?.avatarUrl) {
        embed.setThumbnail(u.avatarUrl);
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  } catch (err) {
    logger.error({ err, mode }, "[leaderboard] failed");
    await interaction.editReply("Something went wrong building the leaderboard.");
  }
}
