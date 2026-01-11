// src/commands/github/status.ts

import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * /github status command
 *
 * Reports current GitHub-related configuration and which GitHub pollers are enabled.
 * This command does not call the GitHub API.
 */
export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Show GitHub integration status for this bot");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const lines: string[] = [];

    // High level config (do not print secrets)
    lines.push("**GitHub Status**");
    lines.push(`Repo: ${env.githubOwner ?? "(unset)"}/${env.githubRepo ?? "(unset)"}`);
    lines.push(`Token: ${env.githubToken ? "present" : "missing"}`);
    lines.push(`Poll interval: ${env.githubPollIntervalMs} ms`);
    lines.push("");

    // PR polling
    lines.push("**PR announcements**");
    lines.push(`Enabled: ${env.githubPrPollingEnabled ? "yes" : "no"}`);
    lines.push(`Channel: ${env.githubPrAnnounceChannelId ?? "(unset)"}`);
    lines.push("");

    // Assignee/issue activity polling
    lines.push("**Assignee + issue activity**");
    lines.push(`Enabled: ${env.githubAssigneePollingEnabled ? "yes" : "no"}`);
    lines.push(`Channel: ${env.githubAssigneeAnnounceChannelId ?? "(unset)"}`);

    await interaction.reply({ content: lines.join("\n"), ephemeral: true });
  } catch (err) {
    logger.error({ err }, "[/status] failed");

    // Best-effort reply (avoid throwing twice)
    const msg = "Something went wrong while building GitHub status.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg });
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  }
}
