import { notionAddTemplatesConfig as rawTemplateConfig } from "../../../config/notionAddTemplates.js";

export type NotionTemplateFieldType =
  | "rich_text"
  | "select"
  | "multi_select"
  | "number"
  | "checkbox";

export type NotionAddTemplateField = {
  id: string;
  label: string;
  placeholder: string | null;
  required: boolean;
  property: string;
  type: NotionTemplateFieldType;
};

export type NotionAddTemplate = {
  key: string;
  label: string;
  description: string | null;
  fields: NotionAddTemplateField[];
};

type RawTemplateField = {
  id?: unknown;
  label?: unknown;
  placeholder?: unknown;
  required?: unknown;
  property?: unknown;
  type?: unknown;
};

type RawTemplate = {
  key?: unknown;
  label?: unknown;
  description?: unknown;
  fields?: unknown;
};

type RawTemplateConfig = {
  defaultTemplate?: unknown;
  templates?: unknown;
};

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFieldType(value: unknown): NotionTemplateFieldType {
  const raw = normalize(value).toLowerCase();
  if (raw === "select") return "select";
  if (raw === "multi_select") return "multi_select";
  if (raw === "number") return "number";
  if (raw === "checkbox") return "checkbox";
  return "rich_text";
}

function sanitizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function toTemplateField(
  raw: RawTemplateField,
  index: number,
): NotionAddTemplateField | null {
  const baseId = sanitizeKey(normalize(raw.id)) || `field-${index + 1}`;
  const label = normalize(raw.label).slice(0, 45);
  const property = normalize(raw.property).slice(0, 100);
  if (!label || !property) return null;

  return {
    id: baseId,
    label,
    placeholder: normalize(raw.placeholder).slice(0, 100) || null,
    required: raw.required === true,
    property,
    type: normalizeFieldType(raw.type),
  };
}

function toTemplate(raw: RawTemplate, index: number): NotionAddTemplate | null {
  const key = sanitizeKey(normalize(raw.key)) || `template-${index + 1}`;
  const label = normalize(raw.label).slice(0, 80);
  if (!label) return null;

  const rawFields = Array.isArray(raw.fields) ? (raw.fields as RawTemplateField[]) : [];
  const fields = rawFields
    .map((field, fieldIndex) => toTemplateField(field, fieldIndex))
    .filter((field): field is NotionAddTemplateField => Boolean(field))
    .slice(0, 2);

  return {
    key,
    label,
    description: normalize(raw.description).slice(0, 200) || null,
    fields,
  };
}

function parseConfig(rawConfig: RawTemplateConfig): {
  defaultTemplate: string;
  templates: NotionAddTemplate[];
} {
  const templatesRaw = Array.isArray(rawConfig.templates)
    ? (rawConfig.templates as RawTemplate[])
    : [];

  const templates = templatesRaw
    .map((template, index) => toTemplate(template, index))
    .filter((template): template is NotionAddTemplate => Boolean(template));

  if (templates.length === 0) {
    templates.push({
      key: "basic",
      label: "Basic Wiki Page",
      description: "Title, optional opening paragraph, and tags.",
      fields: [],
    });
  }

  const rawDefault = sanitizeKey(normalize(rawConfig.defaultTemplate));
  const hasDefault = templates.some((template) => template.key === rawDefault);
  return {
    defaultTemplate: hasDefault ? rawDefault : templates[0]!.key,
    templates,
  };
}

const parsedConfig = parseConfig(rawTemplateConfig as RawTemplateConfig);

export function listNotionAddTemplates(): NotionAddTemplate[] {
  return parsedConfig.templates;
}

export function getNotionAddTemplate(templateKey?: string | null): NotionAddTemplate {
  const requested = sanitizeKey(normalize(templateKey));
  if (requested) {
    const matched = parsedConfig.templates.find((template) => template.key === requested);
    if (matched) return matched;
  }

  const fallback = parsedConfig.templates.find(
    (template) => template.key === parsedConfig.defaultTemplate,
  );
  return fallback ?? parsedConfig.templates[0]!;
}

export function hasNotionAddTemplate(templateKey: string): boolean {
  const requested = sanitizeKey(normalize(templateKey));
  return parsedConfig.templates.some((template) => template.key === requested);
}
