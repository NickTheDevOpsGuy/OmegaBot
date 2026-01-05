// src/commands/github/gh.ts

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  getIssue,
  listIssues,
  listPullRequests,
} from "../../services/github/githubApi.js";
import { getGitHubUserMessage } from "../../services/github/githubErrorMessage.js";
import { logger } from "../../utils/logger.js";

/**
 * /gh command
 * GitHub helpers (issues + PRs)
 */
export const data = new SlashCommandBuilder()
  .setName("gh")
  .setDescription("GitHub helpers")

  .addSubcommand((s) =>
    s
      .setName("issue")
      .setDescription("Fetch a GitHub issue by number")
      .addStringOption((o) =>
        o.setName("owner").setDescription("Org/user").setRequired(true),
      )
      .addStringOption((o) => o.setName("repo").setDescription("Repo").setRequired(true))
      .addIntegerOption((o) =>
        o.setName("number").setDescription("Issue #").setRequired(true),
      ),
  )

  .addSubcommand((s) =>
    s
      .setName("issues")
      .setDescription("List open issues")
      .addStringOption((o) =>
        o.setName("owner").setDescription("Org/user").setRequired(true),
      )
      .addStringOption((o) => o.setName("repo").setDescription("Repo").setRequired(true))
      .addIntegerOption((o) =>
        o
          .setName("limit")
          .setDescription("How many to show (default 5, max 20)")
          .setMinValue(1)
          .setMaxValue(20),
      ),
  )

  .addSubcommand((s) =>
    s
      .setName("prs")
      .setDescription("List open pull requests")
      .addStringOption((o) =>
        o.setName("owner").setDescription("Org/user").setRequired(true),
      )
      .addStringOption((o) => o.setName("repo").setDescription("Repo").setRequired(true))
      .addIntegerOption((o) =>
        o
          .setName("limit")
          .setDescription("How many to show (default 5, max 20)")
          .setMinValue(1)
          .setMaxValue(20),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const owner = interaction.options.getString("owner", true);
  const repo = interaction.options.getString("repo", true);

  try {
    if (sub === "issue") {
      const number = interaction.options.getInteger("number", true);
      const issue = await getIssue(owner, repo, number);

      await interaction.editReply(
        [
          `**${owner}/${repo}#${issue.number}**`,
          issue.title,
          `State: ${issue.state}`,
          `Author: ${issue.user?.login ?? "unknown"}`,
          issue.html_url,
        ].join("\n"),
      );
      return;
    }

    if (sub === "issues") {
      const limit = interaction.options.getInteger("limit") ?? 5;
      const issues = await listIssues(owner, repo, { state: "open", limit });

      if (!issues.length) {
        await interaction.editReply("No open issues found.");
        return;
      }

      await interaction.editReply(
        [
          `**Open issues for ${owner}/${repo}**`,
          "",
          ...issues.map(
            (i) =>
              `#${i.number} ${i.title} (by ${i.user?.login ?? "unknown"})\n${i.html_url}`,
          ),
        ].join("\n"),
      );
      return;
    }

    if (sub === "prs") {
      const limit = interaction.options.getInteger("limit") ?? 5;
      const prs = await listPullRequests(owner, repo, { state: "open", limit });

      if (!prs.length) {
        await interaction.editReply("No open pull requests found.");
        return;
      }

      await interaction.editReply(
        [
          `**Open PRs for ${owner}/${repo}**`,
          "",
          ...prs.map(
            (p) =>
              `#${p.number} ${p.title} (by ${p.user?.login ?? "unknown"})\n${p.html_url}`,
          ),
        ].join("\n"),
      );
      return;
    }

    await interaction.editReply("Unknown subcommand.");
    return;
  } catch (err) {
    const msg = getGitHubUserMessage(err);
    if (msg) {
      await interaction.editReply(msg);
      return;
    }

    logger.warn({ err, owner, repo, sub }, "[gh] GitHub request failed");
    await interaction.editReply("GitHub request failed. Please try again in a bit.");
    return;
  }
}
