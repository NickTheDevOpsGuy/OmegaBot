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
  createNotionClient,
  createNotionPage,
  getNotionDatabaseStatus,
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

function responseOptions(ephemeral: boolean): { flags: MessageFlags.Ephemeral } | undefined {
  return ephemeral ? { flags: MessageFlags.Ephemeral } : undefined;
}

export const data = new SlashCommandBuilder()
  .setName("notion")
  .setDescription("Notion wiki helpers")
  .addSubcommand((sub) =>
    sub
      .setName("search")
      .setDescription("Search the configured Notion wiki")
      .addStringOption((opt) =>
        opt
          .setName("query")
          .setDescription("Page title or keyword")
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(100),
      )
      .addBooleanOption((opt) =>
        opt
          .setName("private")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("status")
      .setDescription("Show Notion integration status")
      .addBooleanOption((opt) =>
        opt
          .setName("private")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
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
      .addBooleanOption((opt) =>
        opt
          .setName("private")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
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
      .addBooleanOption((opt) =>
        opt
          .setName("private")
          .setDescription("Only show the result to you")
          .setRequired(false),
      ),
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
        `✅ Created Notion page **${page.title}**`,
        `Template: \`${template.key}\`${template.description ? ` - ${template.description}` : ""}`,
        templatePromptPreview(template)
          ? `Mapped fields: ${templatePromptPreview(template)}`
          : null,
        tags.length > 0 ? `Tags: ${tags.join(", ")}` : null,
        page.url,
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
      const results = await searchNotionPages({
        client,
        databaseId,
        query,
        limit: 5,
      });

      log.info(
        { subcommand: sub, query, resultCount: results.length, ephemeral },
        "[notion] search completed",
      );

      if (results.length === 0) {
        await interaction.editReply(
          `No Notion pages found for **${query}**. Try a shorter page title or keyword.`,
        );
        return;
      }

      await interaction.editReply(
        [
          `**Notion results for "${query}"**`,
          "",
          ...results.map((result) =>
            [result.title, result.excerpt ?? "No page preview available yet.", result.url]
              .filter(Boolean)
              .join("\n"),
          ),
        ].join("\n\n"),
      );
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
          `✅ Created Notion page **${page.title}**`,
          page.url,
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
    log.error({ err, subcommand: sub }, "[notion] command threw");
    await sendAdminAuditLog(
      interaction,
      [
        sub === "search"
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
  if (sub !== "add" || focused.name !== "template") {
    await interaction.respond([]);
    return;
  }

  const needle = String(focused.value).trim().toLowerCase();
  const templates = listNotionAddTemplates();
  const choices = templates
    .filter((template) => {
      if (!needle) return true;
      return (
        template.key.toLowerCase().includes(needle) ||
        template.label.toLowerCase().includes(needle)
      );
    })
    .slice(0, 25)
    .map((template) => ({
      name: `${template.key} - ${template.label}`.slice(0, 100),
      value: template.key,
    }));

  await interaction.respond(choices);
}
