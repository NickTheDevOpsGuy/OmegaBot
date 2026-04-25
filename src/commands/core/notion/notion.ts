import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { env } from "../../../config/env.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { canUseBotAdmin } from "../../../services/core/permissions/botAdmin.js";
import { sendAdminAuditLog } from "../../../services/discord/discord/adminAudit.js";
import {
  addLimitOption,
  addPrivateOption,
  addQueryOption,
} from "../../../services/discord/discord/slashOptions.js";
import {
  createNotionClient,
  createNotionPage,
  getNotionPageTitleSuggestions,
  getNotionPagesByTag,
  getNotionRecentPages,
  getNotionTagSuggestions,
  getNotionDatabaseStatus,
  getRandomNotionPage,
  openNotionPage,
  type NotionPageSummary,
  type NotionTemplatePropertyInput,
  searchNotionPages,
} from "../../../services/integrations/notion/notionWiki.js";
import {
  getNotionAddTemplate,
  hasNotionAddTemplate,
  listNotionAddTemplates,
  type NotionAddTemplate,
} from "../../../services/integrations/notion/notionTemplates.js";

export const meta = {
  group: "integration",
  adminOnly: false,
};

const NOTION_ADD_MODAL_TIMEOUT_MS = 120_000;
const NOTION_ADD_MODAL_MAX_TEMPLATE_FIELDS = 2;

function responseOptions(
  ephemeral: boolean,
): { flags: MessageFlags.Ephemeral } | undefined {
  return ephemeral ? { flags: MessageFlags.Ephemeral } : undefined;
}

function formatMaskedLink(label: string, url: string | null): string {
  if (!url) return label;
  const safeLabel = label
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
  return `[${safeLabel}](${url})`;
}

function formatLastEditedTime(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTagLine(tags: string[]): string | null {
  return tags.length > 0 ? `Tags: ${tags.join(", ")}` : null;
}

function formatNotionPageBlock(page: NotionPageSummary): string {
  return [
    formatMaskedLink(page.title, page.url),
    formatLastEditedTime(page.lastEditedTime)
      ? `Updated: ${formatLastEditedTime(page.lastEditedTime)}`
      : null,
    formatTagLine(page.tags),
    page.excerpt ?? "No page preview available yet.",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatTemplateChoiceLabel(template: NotionAddTemplate): string {
  return `${template.key} - ${template.label}`.slice(0, 100);
}

export const data = new SlashCommandBuilder()
  .setName("notion")
  .setDescription("Notion wiki helpers")
  .addSubcommand((sub) =>
    sub
      .setName("search")
      .setDescription("Search the configured Notion wiki")
      .addStringOption((opt) =>
        addQueryOption(opt, {
          description: "Page title, tag, or keyword",
          required: true,
          minLength: 2,
          maxLength: 100,
          autocomplete: true,
        }),
      )
      .addIntegerOption((opt) =>
        addLimitOption(opt, {
          description: "How many pages to show",
          min: 1,
          max: 10,
        }),
      )
      .addBooleanOption(addPrivateOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName("open")
      .setDescription("Open a Notion page by title")
      .addStringOption((opt) =>
        opt
          .setName("title")
          .setDescription("Page title")
          .setRequired(true)
          .setMaxLength(200)
          .setAutocomplete(true),
      )
      .addBooleanOption(addPrivateOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName("browse")
      .setDescription("Browse Notion pages by tag")
      .addStringOption((opt) =>
        opt
          .setName("tag")
          .setDescription("Tag to browse")
          .setRequired(true)
          .setMaxLength(100)
          .setAutocomplete(true),
      )
      .addIntegerOption((opt) =>
        addLimitOption(opt, {
          description: "How many tagged pages to show",
          min: 1,
          max: 10,
        }),
      )
      .addBooleanOption(addPrivateOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName("recent")
      .setDescription("Show recently edited Notion pages")
      .addIntegerOption((opt) =>
        addLimitOption(opt, {
          description: "How many recent pages to show",
          min: 1,
          max: 10,
        }),
      )
      .addBooleanOption(addPrivateOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName("random")
      .setDescription("Open a random Notion page")
      .addStringOption((opt) =>
        opt
          .setName("tag")
          .setDescription("Optional tag filter")
          .setRequired(false)
          .setMaxLength(100)
          .setAutocomplete(true),
      )
      .addBooleanOption(addPrivateOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName("status")
      .setDescription("Show Notion integration status")
      .addBooleanOption(addPrivateOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName("templates")
      .setDescription("List guided Notion add templates")
      .addBooleanOption(addPrivateOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName("create-page")
      .setDescription("Create a page in the configured Notion wiki database")
      .addStringOption((opt) =>
        opt
          .setName("title")
          .setDescription("Page title")
          .setRequired(true)
          .setMaxLength(200),
      )
      .addStringOption((opt) =>
        opt
          .setName("content")
          .setDescription("Optional opening paragraph")
          .setRequired(false)
          .setMaxLength(1800),
      )
      .addStringOption((opt) =>
        opt
          .setName("tags")
          .setDescription("Optional comma-separated tags")
          .setRequired(false)
          .setMaxLength(200),
      )
      .addBooleanOption(addPrivateOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Guided Notion page prompt with optional template fields")
      .addStringOption((opt) =>
        opt
          .setName("template")
          .setDescription("Template key (for example: basic, feature)")
          .setRequired(false)
          .setMaxLength(40)
          .setAutocomplete(true),
      )
      .addBooleanOption(addPrivateOption),
  )
  .setDMPermission(false);

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function notionConfigMessage(): string {
  const issues =
    env.notionConfig.issues.length > 0 ? `\n${env.notionConfig.issues.join("\n")}` : "";
  return [
    "Notion wiki is not configured yet.",
    issues,
    "Set `NOTION_TOKEN` and `NOTION_DATABASE_ID` in `.env`, then register commands again if needed.",
  ]
    .filter(Boolean)
    .join("\n");
}

function noPermissionMessage(): string {
  return [
    "You do not have permission to run that Notion admin action.",
    "Use `ADMIN_USER_IDS`, `BOT_ADMIN_ROLE_IDS`, or Discord Manage Server / Administrator access.",
  ].join("\n");
}

function formatNotionFailureMessage(err: unknown): string {
  const detail = err instanceof Error ? err.message.trim() : "";
  if (!detail) return "The Notion command hit a snag. Try again in a moment.";

  return [
    "The Notion command failed.",
    detail,
    "Check `NOTION_DATABASE_ID`, make sure the URL points to a database, and confirm the integration has been shared to it.",
  ].join("\n");
}

function listTemplateKeys(): string {
  const names = listNotionAddTemplates().map((template) => template.key);
  return names.length > 0 ? names.join(", ") : "basic";
}

function templatePromptPreview(template: NotionAddTemplate): string | null {
  if (template.fields.length === 0) return null;
  return template.fields.map((field) => `${field.label} -> ${field.property}`).join("; ");
}

function buildNotionAddModal(
  customId: string,
  template: NotionAddTemplate,
): ModalBuilder {
  if (template.fields.length > NOTION_ADD_MODAL_MAX_TEMPLATE_FIELDS) {
    throw new Error(
      `Notion template "${template.key}" has too many fields for a Discord modal. Limit: ${NOTION_ADD_MODAL_MAX_TEMPLATE_FIELDS} extra fields.`,
    );
  }

  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(`Notion Add: ${template.label}`);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("title")
        .setLabel("Page title")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200),
    ),
  );

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("content")
        .setLabel("Opening paragraph (optional)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1800),
    ),
  );

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("tags")
        .setLabel("Tags (optional, comma-separated)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(200),
    ),
  );

  for (const field of template.fields) {
    const input = new TextInputBuilder()
      .setCustomId(`template:${field.id}`)
      .setLabel(field.label)
      .setStyle(TextInputStyle.Short)
      .setRequired(field.required)
      .setMaxLength(400);
    if (field.placeholder) input.setPlaceholder(field.placeholder);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  }

  return modal;
}

function getTemplatePropertyInputs(
  modalSubmit: ModalSubmitInteraction,
  template: NotionAddTemplate,
): NotionTemplatePropertyInput[] {
  const collected: NotionTemplatePropertyInput[] = [];
  for (const field of template.fields) {
    const value = modalSubmit.fields.getTextInputValue(`template:${field.id}`).trim();
    if (!value) continue;
    collected.push({
      property: field.property,
      type: field.type,
      value,
    });
  }
  return collected;
}

async function executeNotionAdd(
  interaction: ChatInputCommandInteraction,
  ephemeral: boolean,
): Promise<void> {
  const log = getContextLogger();
  if (!env.notionEnabled) {
    await interaction.reply({
      content: notionConfigMessage(),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!canUseBotAdmin(interaction)) {
    await interaction.reply({
      content: noPermissionMessage(),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const requestedTemplate = interaction.options.getString("template");
  if (requestedTemplate && !hasNotionAddTemplate(requestedTemplate)) {
    await interaction.reply({
      content: `Unknown template \`${requestedTemplate}\`. Available templates: ${listTemplateKeys()}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const template = getNotionAddTemplate(requestedTemplate);
  const modalCustomId = `notion-add:${interaction.id}`;
  const modal = buildNotionAddModal(modalCustomId, template);
  await interaction.showModal(modal);

  let modalSubmit: ModalSubmitInteraction;
  try {
    modalSubmit = await interaction.awaitModalSubmit({
      time: NOTION_ADD_MODAL_TIMEOUT_MS,
      filter: (candidate) =>
        candidate.customId === modalCustomId && candidate.user.id === interaction.user.id,
    });
  } catch {
    return;
  }

  await modalSubmit.deferReply(responseOptions(ephemeral));

  try {
    const { token, databaseId } = env.requireNotionConfig();
    const client = createNotionClient(token);
    const title = modalSubmit.fields.getTextInputValue("title").trim();
    const content = modalSubmit.fields.getTextInputValue("content").trim();
    const tags = parseTags(modalSubmit.fields.getTextInputValue("tags"));
    const templateProperties = getTemplatePropertyInputs(modalSubmit, template);

    const page = await createNotionPage({
      client,
      databaseId,
      title,
      content: content || null,
      tags,
      templateProperties,
    });

    await modalSubmit.editReply(
      [
        `✅ Created Notion page ${formatMaskedLink(page.title, page.url)}`,
        `Template: \`${template.key}\`${template.description ? ` - ${template.description}` : ""}`,
        templatePromptPreview(template)
          ? `Mapped fields: ${templatePromptPreview(template)}`
          : null,
        tags.length > 0 ? `Tags: ${tags.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    await sendAdminAuditLog(
      interaction,
      [
        "📘 **Notion page created (guided)**",
        `Actor: <@${interaction.user.id}>`,
        `Guild: ${interaction.guildId ?? "dm"}`,
        `Template: ${template.key}`,
        `Title: **${page.title}**`,
        `Tags: ${tags.length > 0 ? tags.join(", ") : "(none)"}`,
        `Template fields: ${templateProperties.length}`,
        page.url,
      ].join("\n"),
    );

    log.info(
      {
        subcommand: "add",
        pageId: page.id,
        title,
        template: template.key,
        tagCount: tags.length,
        templatePropertyCount: templateProperties.length,
      },
      "[notion] created page via guided add flow",
    );
  } catch (err) {
    log.error({ err, subcommand: "add" }, "[notion] guided add flow threw");
    await modalSubmit.editReply(formatNotionFailureMessage(err));
  }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);
  const ephemeral = interaction.options.getBoolean("private") ?? true;
  const log = getContextLogger();

  if (sub === "add") {
    await executeNotionAdd(interaction, ephemeral);
    return;
  }

  await interaction.deferReply(responseOptions(ephemeral));

  try {
    if (!env.notionEnabled) {
      log.warn(
        { subcommand: sub },
        "[notion] command blocked, integration not configured",
      );
      await interaction.editReply(notionConfigMessage());
      return;
    }

    const { token, databaseId } = env.requireNotionConfig();
    const client = createNotionClient(token);

    if (sub === "search") {
      const query = interaction.options.getString("query", true).trim();
      const limit = interaction.options.getInteger("limit") ?? 5;
      const results = await searchNotionPages({
        client,
        databaseId,
        query,
        limit,
      });

      log.info(
        { subcommand: sub, query, limit, resultCount: results.length, ephemeral },
        "[notion] search completed",
      );

      if (results.length === 0) {
        await interaction.editReply(
          `No Notion pages found for **${query}**. Try a page title, a tag, or use \`/notion recent\`.`,
        );
        return;
      }

      await interaction.editReply(
        [
          `**Notion results for "${query}"**`,
          "",
          ...results.map(formatNotionPageBlock),
        ].join("\n\n"),
      );
      return;
    }

    if (sub === "open") {
      const title = interaction.options.getString("title", true).trim();
      const page = await openNotionPage({
        client,
        databaseId,
        title,
      });

      log.info(
        { subcommand: sub, title, found: Boolean(page), ephemeral },
        "[notion] open completed",
      );

      if (!page) {
        await interaction.editReply(
          `I couldn't find a Notion page matching **${title}**. Try \`/notion search\` or autocomplete from \`/notion open\`.`,
        );
        return;
      }

      await interaction.editReply(
        ["**Notion page**", "", formatNotionPageBlock(page)].join("\n"),
      );
      return;
    }

    if (sub === "browse") {
      const tag = interaction.options.getString("tag", true).trim();
      const limit = interaction.options.getInteger("limit") ?? 5;
      const results = await getNotionPagesByTag({
        client,
        databaseId,
        tag,
        limit,
      });

      log.info(
        { subcommand: sub, tag, limit, resultCount: results.length, ephemeral },
        "[notion] browse completed",
      );

      if (results.length === 0) {
        await interaction.editReply(
          `No Notion pages were found for tag **${tag}**. Try another tag or use \`/notion recent\`.`,
        );
        return;
      }

      await interaction.editReply(
        [
          `**Notion pages tagged "${tag}"**`,
          "",
          ...results.map(formatNotionPageBlock),
        ].join("\n\n"),
      );
      return;
    }

    if (sub === "recent") {
      const limit = interaction.options.getInteger("limit") ?? 5;
      const results = await getNotionRecentPages({
        client,
        databaseId,
        limit,
      });

      log.info(
        { subcommand: sub, limit, resultCount: results.length, ephemeral },
        "[notion] recent completed",
      );

      if (results.length === 0) {
        await interaction.editReply("No recent Notion pages were found yet.");
        return;
      }

      await interaction.editReply(
        ["**Recent Notion pages**", "", ...results.map(formatNotionPageBlock)].join(
          "\n\n",
        ),
      );
      return;
    }

    if (sub === "random") {
      const tag = interaction.options.getString("tag");
      const page = await getRandomNotionPage({
        client,
        databaseId,
        tag,
      });

      log.info(
        { subcommand: sub, tag, found: Boolean(page), ephemeral },
        "[notion] random completed",
      );

      if (!page) {
        const detail = tag
          ? `I couldn't find any Notion pages tagged **${tag}**.`
          : "I couldn't find any Notion pages to pick from yet.";
        await interaction.editReply(detail);
        return;
      }

      const heading = tag
        ? `**Random Notion page from "${tag}"**`
        : "**Random Notion page**";
      await interaction.editReply([heading, "", formatNotionPageBlock(page)].join("\n"));
      return;
    }

    if (!canUseBotAdmin(interaction)) {
      log.warn({ subcommand: sub }, "[notion] admin action blocked, missing permission");
      await interaction.editReply(noPermissionMessage());
      return;
    }

    if (sub === "status") {
      const status = await getNotionDatabaseStatus({ client, databaseId });
      const lines = [
        "**Notion integration status**",
        `Configured: ${env.notionEnabled ? "yes" : "no"}`,
        `Database title: ${status.databaseTitle ?? "(untitled database)"}`,
        `Title property: ${status.titleProperty}`,
        `Tag property: ${
          status.tagProperty
            ? `${status.tagProperty.name} (${status.tagProperty.type})`
            : "not detected"
        }`,
        `Guided templates: ${listNotionAddTemplates().length}`,
        `Admin user allowlist entries: ${env.adminUserIds.size}`,
        `Admin role allowlist entries: ${env.botAdminRoleIds.size}`,
        `Audit channel: ${env.botAdminAuditChannelId ?? "(unset)"}`,
      ];

      await interaction.editReply(lines.join("\n"));

      await sendAdminAuditLog(
        interaction,
        [
          "📘 **Notion status viewed**",
          `Actor: ${interaction.user?.id ? `<@${interaction.user.id}>` : "unknown"}`,
          `Guild: ${interaction.guildId ?? "dm"}`,
          `Database: ${status.databaseTitle ?? "(untitled database)"}`,
          `Title property: ${status.titleProperty}`,
          `Tag property: ${
            status.tagProperty
              ? `${status.tagProperty.name} (${status.tagProperty.type})`
              : "not detected"
          }`,
        ].join("\n"),
      );
      log.info(
        {
          subcommand: sub,
          databaseTitle: status.databaseTitle ?? null,
          titleProperty: status.titleProperty,
          tagProperty: status.tagProperty?.name ?? null,
        },
        "[notion] viewed integration status",
      );
      return;
    }

    if (sub === "templates") {
      const templates = listNotionAddTemplates();
      const lines = [
        "**Notion add templates**",
        "",
        ...templates.flatMap((template) => [
          `**${template.key}** - ${template.label}`,
          template.description ?? "No description set.",
          template.fields.length > 0
            ? `Fields: ${template.fields
                .map((field) => `${field.label} -> ${field.property} (${field.type})`)
                .join("; ")}`
            : "Fields: none",
          "",
        ]),
      ];

      await interaction.editReply(lines.join("\n").trim());

      await sendAdminAuditLog(
        interaction,
        [
          "📘 **Notion templates viewed**",
          `Actor: ${interaction.user?.id ? `<@${interaction.user.id}>` : "unknown"}`,
          `Guild: ${interaction.guildId ?? "dm"}`,
          `Template count: ${templates.length}`,
        ].join("\n"),
      );
      return;
    }

    if (sub === "create-page") {
      const title = interaction.options.getString("title", true).trim();
      const content = interaction.options.getString("content");
      const tags = parseTags(interaction.options.getString("tags"));

      const page = await createNotionPage({
        client,
        databaseId,
        title,
        content,
        tags,
      });

      log.info(
        {
          subcommand: sub,
          pageId: page.id,
          title,
          tagCount: tags.length,
          ephemeral,
        },
        "[notion] created page via command",
      );

      await interaction.editReply(
        [
          `✅ Created Notion page ${formatMaskedLink(page.title, page.url)}`,
          tags.length > 0 ? `Tags: ${tags.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      );

      await sendAdminAuditLog(
        interaction,
        [
          "📘 **Notion page created**",
          `Actor: ${interaction.user?.id ? `<@${interaction.user.id}>` : "unknown"}`,
          `Guild: ${interaction.guildId ?? "dm"}`,
          `Title: **${page.title}**`,
          `Tags: ${tags.length > 0 ? tags.join(", ") : "(none)"}`,
          page.url,
        ].join("\n"),
      );
      return;
    }

    log.warn({ subcommand: sub }, "[notion] command received unknown subcommand");
    await interaction.editReply("That Notion subcommand was not recognized.");
  } catch (err) {
    const isUserLookupAction = ["search", "open", "browse", "recent", "random"].includes(
      sub,
    );
    log.error({ err, subcommand: sub }, "[notion] command threw");
    await sendAdminAuditLog(
      interaction,
      [
        isUserLookupAction
          ? "📘 **Notion search failed**"
          : "📘 **Notion admin action failed**",
        `Actor: ${interaction.user?.id ? `<@${interaction.user.id}>` : "unknown"}`,
        `Guild: ${interaction.guildId ?? "dm"}`,
        `Action: ${sub}`,
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      ].join("\n"),
    );
    await interaction.editReply(formatNotionFailureMessage(err));
  }
}

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(false);
  const focused = interaction.options.getFocused(true);
  const needle = String(focused.value).trim();

  if (sub === "add" && focused.name === "template") {
    const choices = listNotionAddTemplates()
      .filter((template) => {
        if (!needle) return true;
        const normalized = needle.toLowerCase();
        return (
          template.key.toLowerCase().includes(normalized) ||
          template.label.toLowerCase().includes(normalized)
        );
      })
      .slice(0, 25)
      .map((template) => ({
        name: formatTemplateChoiceLabel(template),
        value: template.key,
      }));

    await interaction.respond(choices);
    return;
  }

  if (!env.notionEnabled) {
    await interaction.respond([]);
    return;
  }

  try {
    const { token, databaseId } = env.requireNotionConfig();
    const client = createNotionClient(token);

    if (
      (sub === "search" && focused.name === "query") ||
      (sub === "open" && focused.name === "title")
    ) {
      const titles = await getNotionPageTitleSuggestions({
        client,
        databaseId,
        query: needle,
        limit: 25,
      });
      await interaction.respond(
        titles.map((title) => ({
          name: title.slice(0, 100),
          value: title,
        })),
      );
      return;
    }

    if ((sub === "browse" || sub === "random") && focused.name === "tag") {
      const tags = await getNotionTagSuggestions({
        client,
        databaseId,
        query: needle,
        limit: 25,
      });
      await interaction.respond(
        tags.map((tag) => ({
          name: tag.slice(0, 100),
          value: tag,
        })),
      );
      return;
    }
  } catch (err) {
    getContextLogger().warn(
      { err, sub, focused: focused.name },
      "[notion] autocomplete threw",
    );
  }

  await interaction.respond([]);
}
