// src/commands/github/pr.ts

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { GitHubApiError } from "../../services/github/githubClient.js";
import { getPullRequest } from "../../services/github/githubApi.js";
import { logger } from "../../utils/logger.js";

/**
 * /pr command
 * Fetch a single PR by number.
 */
export const data = new SlashCommandBuilder()
  .setName("pr")
  .setDescription("GitHub pull request helpers")
  .addIntegerOption((o) =>
    o.setName("number").setDescription("PR #").setRequired(true),
  )
  .addStringOption((o) =>
    o.setName("owner").setDescription("Org/user").setRequired(true),
  )
  .addStringOption((o) =>
    o.setName("repo").setDescription("Repo").setRequired(true),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const owner = interaction.options.getString("owner", true);
  const repo = interaction.options.getString("repo", true);
  const number = interaction.options.getInteger("number", true);

  try {
    const pr = await getPullRequest(owner, repo, number);

    const mergedLabel = pr.merged ? "merged" : "not merged";
    const body = [
      `**${owner}/${repo} PR #${pr.number}**`,
      pr.title,
      `State: ${pr.state} (${mergedLabel})`,
      `Author: ${pr.user?.login ?? "unknown"}`,
      `URL: ${pr.html_url}`,
    ].join("\n");

    await interaction.editReply(body);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 404) {
        await interaction.editReply(
          "PR not found. Check owner/repo and PR number.",
        );
        return;
      }

      logger.warn(
        { err, owner, repo, number },
        "[pr] GitHub API error",
      );

      await interaction.editReply(
        `GitHub API error (${err.status}): ${err.message}`,
      );
      return;
    }

    logger.error(
      { err, owner, repo, number },
      "[pr] command failed",
    );

    await interaction.editReply(
      "Something went wrong while talking to GitHub.",
    );
  }
}