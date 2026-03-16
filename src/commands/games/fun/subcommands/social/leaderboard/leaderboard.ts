// src/commands/fun/subcommands/leaderboard.ts
// /fun leaderboard: top users, top commands, or one user's breakdown. Uses fun_usage snapshot or usage_log (weekly/server).
import { EmbedBuilder, type ChatInputCommandInteraction, type User } from "discord.js";
import { getFunUsageSnapshot } from "../../../../../../services/stores/fun/funUsageStore.js";
import { getUsageLeaderboard } from "../../../../../../services/platform/leaderboardService.js";
import { logger } from "../../../../../../utils/logger.js";

export type LeaderboardMode =
  | {
      kind: "users";
      limit: number;
      scope?: "all" | "weekly" | "server";
      guildId?: string;
    }
  | {
      kind: "commands";
      limit: number;
      scope?: "all" | "weekly" | "server";
      guildId?: string;
    }
  | { kind: "user"; userId: string };

type PerCommandCounts = Record<string, number>;

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
  if (!top.length) return ["No per-command data yet."];

  // Keep per-command breakdown easy to scan
  return top.map((x) => `/fun ${x.command} ${x.count}x`);
}

function rankLabel(idx: number): string {
  // 0-based idx
  const medals = ["🥇", "🥈", "🥉"];
  if (idx < medals.length) return medals[idx];

  // 4th+ as emoji digits when possible; fallback to plain number.
  const n = idx + 1;
  const digitEmoji: Record<string, string> = {
    "0": "0️⃣",
    "1": "1️⃣",
    "2": "2️⃣",
    "3": "3️⃣",
    "4": "4️⃣",
    "5": "5️⃣",
    "6": "6️⃣",
    "7": "7️⃣",
    "8": "8️⃣",
    "9": "9️⃣",
  };

  const s = String(n);
  const allDigits = [...s].every((c) => c >= "0" && c <= "9");
  if (!allDigits) return `${n}.`;

  // Works great up through 9. For 10+ it becomes "1️⃣0️⃣" which is still readable.
  return [...s].map((c) => digitEmoji[c] ?? c).join("");
}

async function safeFetchUser(
  interaction: ChatInputCommandInteraction,
  userId: string,
): Promise<User | null> {
  try {
    return await interaction.client.users.fetch(userId);
  } catch (err) {
    logger.debug({ err, userId }, "[fun/leaderboard] fetch user threw");
    return null;
  }
}

export async function run(
  interaction: ChatInputCommandInteraction,
  mode: LeaderboardMode,
): Promise<void> {
  const scope = mode.kind !== "user" ? (mode.scope ?? "all") : "all";
  const useLog = scope === "weekly" || scope === "server";
  const guildId = mode.kind !== "user" ? mode.guildId : undefined;

  let snapshot = await getFunUsageSnapshot();
  let totalsByUser = snapshot.totalsByUser;
  let totalsByCommand = snapshot.totalsByCommand;
  let byUserByCommand = snapshot.byUserByCommand;
  const updatedAt = snapshot.updatedAt ?? "unknown";

  if (useLog && (mode.kind === "users" || mode.kind === "commands")) {
    try {
      const data = await getUsageLeaderboard({
        scope: mode.kind === "users" ? "users" : "commands",
        limit: mode.limit,
        window: scope === "weekly" ? "weekly" : undefined,
        guildId: scope === "server" ? (guildId ?? null) : undefined,
      });
      if (
        mode.kind === "commands" &&
        Array.isArray(data) &&
        data.length > 0 &&
        "command" in data[0]
      ) {
        const items = data as { command: string; count: number }[];
        const embed = new EmbedBuilder()
          .setTitle(
            scope === "weekly"
              ? "Fun Leaderboard: Top Commands (This Week)"
              : "Fun Leaderboard: Top Commands (This Server)",
          )
          .setDescription(
            items
              .map((x, idx) => `${rankLabel(idx)} /fun ${x.command} ${x.count}x`)
              .join("\n"),
          )
          .setFooter({ text: scope === "weekly" ? "Weekly usage" : "Server usage" });
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      if (
        mode.kind === "users" &&
        Array.isArray(data) &&
        data.length > 0 &&
        "userId" in data[0]
      ) {
        const userItems = data as { rank: number; userId: string; value: number }[];
        const embed = new EmbedBuilder()
          .setTitle(
            scope === "weekly"
              ? "Fun Leaderboard: Top Users (This Week)"
              : "Fun Leaderboard: Top Users (This Server)",
          )
          .setDescription(
            userItems
              .map((u, idx) => `${rankLabel(idx)} <@${u.userId}> ${u.value}x`)
              .join("\n"),
          )
          .setFooter({ text: scope === "weekly" ? "Weekly usage" : "Server usage" });
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err) {
      logger.debug(
        { err, scope },
        "[fun/leaderboard] getUsageLeaderboard (log) failed, falling back to snapshot",
      );
    }
  }

  const anyUserUsage = Object.keys(totalsByUser).length > 0;
  const anyCommandUsage = Object.values(totalsByCommand).some((n) => toCount(n) > 0);

  const embed = new EmbedBuilder().setFooter({ text: `Updated: ${updatedAt}` });

  if (!anyUserUsage && !anyCommandUsage) {
    embed.setTitle("Fun Leaderboard");
    embed.setDescription(
      "No fun command usage recorded yet. Try `/fun 8ball` or `/fun rps` to get started!",
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const limit = clampLimit("limit" in mode ? mode.limit : 10, 1, 25);

  // ---- Top Commands view ----
  if (mode.kind === "commands") {
    const items = Object.entries(totalsByCommand)
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

    // Emoji ranks, no bullets, no dashes
    const lines = items.map((x, idx) => `${rankLabel(idx)} /fun ${x.cmd} ${x.count}x`);
    embed.setDescription(lines.join("\n"));
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

    // Better resolution avatar
    // - request a larger size (1024 or 2048 is plenty)
    // - force png for consistency
    const avatar =
      user?.displayAvatarURL({
        extension: "png",
        size: 2048,
      }) ?? null;

    embed.setTitle(`Fun Usage: ${name}`);
    if (avatar) embed.setThumbnail(avatar);

    const top1 = topFromPerCmd(perCmd, 1)[0] ?? null;
    const topLine = top1 ? `Top command: /fun ${top1.command} ${top1.count}x` : "";

    const lines = formatPerCmdLines(perCmd);

    // Keep this clean, but still readable
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
  const userItems = Object.entries(totalsByUser)
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

  // Emoji ranks + “user X ran command Y this many times”
  // No bullets, no dash separators
  const out: string[] = [];

  for (let idx = 0; idx < userItems.length; idx += 1) {
    const item = userItems[idx]!;
    const perCmd = byUserByCommand[item.userId] ?? {};
    const breakdown = formatPerCmdInline(perCmd, 3);

    const prefix = rankLabel(idx);
    if (breakdown) {
      out.push(`${prefix} <@${item.userId}> ${item.total}x (${breakdown})`);
    } else {
      out.push(`${prefix} <@${item.userId}> ${item.total}x`);
    }
  }

  embed.setDescription(out.join("\n"));
  await interaction.editReply({ embeds: [embed] });
}
