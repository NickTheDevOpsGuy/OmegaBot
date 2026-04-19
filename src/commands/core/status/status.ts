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
} from "../../../services/integrations/statuspage/statuspageApi.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";

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
  .setDescription("Check service status (Vercel, Supabase, ChatGPT, Claude, Cursor)")

  .addSubcommand((s) =>
    s.setName("vercel").setDescription("Check Vercel platform status"),
  )
  .addSubcommand((s) =>
    s.setName("supabase").setDescription("Check Supabase platform status"),
  )
  .addSubcommand((s) =>
    s.setName("chatgpt").setDescription("Check OpenAI / ChatGPT status"),
  )
  .addSubcommand((s) =>
    s.setName("claude").setDescription("Check Anthropic Claude status"),
  )
  .addSubcommand((s) => s.setName("cursor").setDescription("Check Cursor IDE status"))
  .addSubcommand((s) =>
    s.setName("llms").setDescription("Check all LLM statuses (ChatGPT, Claude, Cursor)"),
  );

const LLM_SERVICES: ServiceName[] = ["chatgpt", "claude", "cursor"];

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (sub === "llms") {
    const results = await Promise.allSettled(
      LLM_SERVICES.map((s) => fetchStatuspageSummary(s)),
    );
    const emoji = (ind: string) =>
      ind === "none" ? "✅" : ind === "minor" ? "⚠️" : "🔴";
    const lines = LLM_SERVICES.map((name, i) => {
      const r = results[i];
      if (r.status === "fulfilled") {
        const e = emoji(r.value.status.indicator);
        return `${e} **${r.value.page.name}** — ${r.value.status.description}\n   <${r.value.page.url}>`;
      }
      return `❌ **${name}** — Couldn't fetch status. The service may be unreachable.`;
    });
    await interaction.editReply(["**LLM status**", "", ...lines].join("\n"));
    return;
  }

  try {
    const summary = await fetchStatuspageSummary(sub as ServiceName);
    const formatted = formatStatus(summary);

    await interaction.editReply(formatted);
  } catch (err) {
    getContextLogger().warn({ err, service: sub }, "[status] status fetch threw");

    await interaction.editReply(
      `We couldn't fetch ${sub} status. The service may be unreachable. Try again in a moment.`,
    );
  }
}
