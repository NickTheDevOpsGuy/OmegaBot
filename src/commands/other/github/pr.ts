// src/commands/github/pr.ts

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getPullRequest } from "../../../services/integrations/github/githubApi.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { getGitHubUserMessage } from "../../../services/integrations/github/shared/githubErrorMessage.js";

/**
 * /pr command
 * Fetch a single PR by number.
 */
export const data = new SlashCommandBuilder()
  .setName("pr")
  .setDescription("Fetch a GitHub pull request by number")
  .addIntegerOption((o) => o.setName("number").setDescription("PR #").setRequired(true))
  .addStringOption((o) => o.setName("owner").setDescription("Org/user").setRequired(true))
  .addStringOption((o) => o.setName("repo").setDescription("Repo").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
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
      pr.html_url,
    ].join("\n");

    await interaction.editReply(body);
    return;
  } catch (err) {
    const msg = getGitHubUserMessage(err);
    if (msg) {
      await interaction.editReply(msg);
      return;
    }

    getContextLogger().warn({ err, owner, repo, number }, "[pr] GitHub PR fetch threw");
    await interaction.editReply("GitHub didn't respond. Try again in a moment.");
    return;
  }
}
