// src/commands/status/status.ts
//
// Slash command to check service status (Vercel, Supabase, etc.)
// Uses Statuspage v2 API - same format as Vercel, Supabase, GitHub, etc.

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  fetchStatuspageSummary,
  type ServiceName,
  type StatuspageSummary,
} from "../../services/statuspage/statuspageApi.js";
import { logger } from "../../utils/logger.js";

function formatStatus(summary: StatuspageSummary): string {
  const lines: string[] = [];

  const indicator = summary.status.indicator;
  const desc = summary.status.description;

  // Status emoji based on indicator
  const emoji =
    indicator === "none"
      ? "✅"
      : indicator === "minor"
        ? "⚠️"
        : indicator === "major" || indicator === "critical"
          ? "🔴"
          : "🟡";

  lines.push(`**${summary.page.name}** ${emoji}`);
  lines.push(`${desc}`);
  lines.push(`<${summary.page.url}>`);
  lines.push("");

  // Show degraded components (non-operational)
  const degraded = summary.components.filter(
    (c) => c.status !== "operational" && !c.group,
  );

  if (degraded.length > 0) {
    lines.push("**Degraded components:**");
    for (const c of degraded.slice(0, 10)) {
      const statusEmoji =
        c.status === "major_outage" ? "🔴" : c.status === "partial_outage" ? "🟠" : "🟡";
      lines.push(`${statusEmoji} ${c.name}: ${c.status}`);
    }
    if (degraded.length > 10) {
      lines.push(`_...and ${degraded.length - 10} more_`);
    }
    lines.push("");
  }

  // Show active incidents
  if (summary.incidents.length > 0) {
    lines.push("**Active incidents:**");
    for (const inc of summary.incidents.slice(0, 3)) {
      lines.push(`• **${inc.name}** (${inc.impact})`);
      const latest = inc.incident_updates?.[0];
      if (latest?.body) {
        const snippet =
          latest.body.length > 150 ? `${latest.body.slice(0, 150)}...` : latest.body;
        lines.push(`  ${snippet}`);
      }
      if (inc.shortlink) lines.push(`  ${inc.shortlink}`);
    }
    lines.push("");
  }

  lines.push(`_Updated: ${summary.page.updated_at}_`);

  return lines.join("\n");
}

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Check service status (Vercel, Supabase)")

  .addSubcommand((s) =>
    s.setName("vercel").setDescription("Check Vercel platform status"),
  )

  .addSubcommand((s) =>
    s.setName("supabase").setDescription("Check Supabase platform status"),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true) as ServiceName;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const summary = await fetchStatuspageSummary(sub);
    const formatted = formatStatus(summary);

    await interaction.editReply(formatted);
  } catch (err) {
    logger.warn({ err, service: sub }, "[status] fetch failed");

    await interaction.editReply(
      `Failed to fetch ${sub} status. The service may be unreachable. Try again in a moment.`,
    );
  }
}
