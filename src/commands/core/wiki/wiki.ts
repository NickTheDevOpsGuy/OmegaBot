import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { env } from "../../../config/env.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import {
  createNotionClient,
  searchNotionPages,
} from "../../../services/integrations/notion/notionWiki.js";
import {
  searchWiki,
  type WikiResult,
  type WikiSourceFilter,
} from "../../../services/integrations/wiki/wikiSearch.js";

export const meta = {
  group: "integration",
  adminOnly: false,
};

export const data = new SlashCommandBuilder()
  .setName("wiki")
  .setDescription("Search curated docs and the optional Notion wiki")
  .addStringOption((opt) =>
    opt
      .setName("query")
      .setDescription("What are you looking for?")
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(100),
  )
  .addStringOption((opt) =>
    opt
      .setName("source")
      .setDescription("Where to search")
      .setRequired(false)
      .addChoices(
        { name: "Auto (FAQ + Notion)", value: "auto" },
        { name: "FAQ only", value: "faq" },
        { name: "Notion only", value: "notion" },
      ),
  )
  .addBooleanOption((opt) =>
    opt
      .setName("private")
      .setDescription("Only show the result to you")
      .setRequired(false),
  )
  .setDMPermission(true);

function formatResult(result: WikiResult): string {
  const sourceLabel = result.source === "faq" ? "FAQ" : "Notion";
  const lines = [`**[${sourceLabel}] ${result.title}**`];

  if (result.key) lines.push(`Key: \`${result.key}\``);
  if (result.tags.length > 0) lines.push(`Tags: ${result.tags.join(", ")}`);
  lines.push(result.excerpt);
  if (result.url) lines.push(result.url);

  return lines.join("\n");
}

function buildReply(
  query: string,
  source: WikiSourceFilter,
  results: WikiResult[],
): string {
  const sourceLabel =
    source === "auto" ? "FAQ + Notion" : source === "faq" ? "FAQ only" : "Notion only";

  if (results.length === 0) {
    const notionHint =
      source !== "faq" && !env.notionEnabled && env.notionConfig.issues.length > 0
        ? ["", "Notion is partially configured:", ...env.notionConfig.issues]
        : [];
    return [
      `No wiki results found for **${query}**.`,
      `Scope: ${sourceLabel}`,
      "",
      "Tips:",
      "- Try a shorter page title or keyword",
      "- Curated server docs can be added with `/faq add`",
      "- Use `/faq list query:<term>` for a broader FAQ-only scan",
      ...notionHint,
    ].join("\n");
  }

  return [
    `**Wiki results for "${query}"**`,
    `Scope: ${sourceLabel}`,
    "",
    results.map((result) => formatResult(result)).join("\n\n────────\n\n"),
  ].join("\n");
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const query = interaction.options.getString("query", true).trim();
  const source = (interaction.options.getString("source") ?? "auto") as WikiSourceFilter;
  const ephemeral = interaction.options.getBoolean("private") ?? true;

  await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : undefined);

  try {
    const notionSearch =
      env.notionEnabled && source !== "faq"
        ? (searchQuery: string, limit: number) =>
            searchNotionPages({
              client: createNotionClient(env.requireNotionConfig().token),
              databaseId: env.requireNotionConfig().databaseId,
              query: searchQuery,
              limit,
            })
        : undefined;

    const { results, notices } = await searchWiki({
      query,
      source,
      limit: 5,
      notionSearch,
    });

    getContextLogger().info(
      {
        query,
        source,
        resultCount: results.length,
        noticeCount: notices.length,
      },
      "[wiki] search completed",
    );

    const reply = [buildReply(query, source, results), ...notices].join("\n\n").trim();
    await interaction.editReply(reply);
  } catch (err) {
    getContextLogger().error({ err, query, source }, "[wiki] search threw");
    await interaction.editReply("The wiki search hit a snag. Try again in a moment.");
  }
}
