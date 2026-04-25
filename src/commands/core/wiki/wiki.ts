import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { env } from "../../../config/env.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { sendAdminAuditLog } from "../../../services/discord/discord/adminAudit.js";
import {
  addLimitOption,
  addPrivateOption,
  addQueryOption,
} from "../../../services/discord/discord/slashOptions.js";
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
    addQueryOption(opt, {
      description: "What are you looking for?",
      required: true,
      minLength: 2,
      maxLength: 100,
    }),
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
  .addIntegerOption((opt) =>
    addLimitOption(opt, {
      description: "How many results to show",
      min: 1,
      max: 10,
    }),
  )
  .addBooleanOption(addPrivateOption)
  .setDMPermission(true);

function formatMaskedLink(label: string, url: string | null): string {
  if (!url) return label;
  const safeLabel = label
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
  return `[${safeLabel}](${url})`;
}

function formatResult(result: WikiResult): string {
  const title = result.url ? formatMaskedLink(result.title, result.url) : result.title;
  const lines = [result.url ? title : `**${title}**`];

  if (result.key) lines.push(`Key: \`${result.key}\``);
  if (result.tags.length > 0) lines.push(`Tags: ${result.tags.join(", ")}`);
  lines.push(result.excerpt);

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

function formatWikiFailureMessage(err: unknown): string {
  const detail = err instanceof Error ? err.message.trim() : "";
  if (!detail) return "The wiki search hit a snag. Try again in a moment.";

  return [
    "The wiki search failed.",
    detail,
    "If this is a Notion search, verify `NOTION_DATABASE_ID` and share the database with the integration.",
  ].join("\n");
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const query = interaction.options.getString("query", true).trim();
  const source = (interaction.options.getString("source") ?? "auto") as WikiSourceFilter;
  const limit = interaction.options.getInteger("limit") ?? 5;
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
      limit,
      notionSearch,
    });

    getContextLogger().info(
      {
        query,
        source,
        limit,
        resultCount: results.length,
        noticeCount: notices.length,
      },
      "[wiki] search completed",
    );

    const reply = [buildReply(query, source, results), ...notices].join("\n\n").trim();
    await interaction.editReply(reply);
  } catch (err) {
    getContextLogger().error({ err, query, source, limit }, "[wiki] search threw");
    await sendAdminAuditLog(
      interaction,
      [
        "📘 **Wiki search failed**",
        `Actor: ${interaction.user?.id ? `<@${interaction.user.id}>` : "unknown"}`,
        `Guild: ${interaction.guildId ?? "dm"}`,
        `Query: ${query}`,
        `Source: ${source}`,
        `Limit: ${limit}`,
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      ].join("\n"),
    );
    await interaction.editReply(formatWikiFailureMessage(err));
  }
}
