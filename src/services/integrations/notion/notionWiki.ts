import {
  Client,
  type CreatePageParameters,
  type QueryDataSourceParameters,
} from "@notionhq/client";
import { extractPlainTextFromNotionBlocks, truncateNotionExcerpt } from "./notionText.js";

type UnknownRecord = Record<string, unknown>;

export type NotionSearchResult = {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  lastEditedTime: string | null;
};

export type NotionDatabaseStatus = {
  databaseTitle: string | null;
  dataSourceId: string;
  titleProperty: string;
  tagProperty: { name: string; type: "multi_select" | "select" | "rich_text" } | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readTitleParts(value: unknown): string {
  if (!Array.isArray(value)) return "";

  return value
    .map((part) => readString(readRecord(part)?.["plain_text"]))
    .filter((part): part is string => Boolean(part))
    .join("")
    .trim();
}

export function createNotionClient(token: string): Client {
  return new Client({ auth: token });
}

export function findDatabaseTitlePropertyName(properties: unknown): string | null {
  const record = readRecord(properties);
  if (!record) return null;

  for (const [name, config] of Object.entries(record)) {
    if (readString(readRecord(config)?.["type"]) === "title") return name;
  }

  return null;
}

export function findDatabaseTagProperty(properties: unknown): NotionDatabaseStatus["tagProperty"] {
  const record = readRecord(properties);
  if (!record) return null;

  for (const [name, config] of Object.entries(record)) {
    const type = readString(readRecord(config)?.["type"]);
    if (!type) continue;
    if (!/tag/i.test(name)) continue;

    if (type === "multi_select" || type === "select" || type === "rich_text") {
      return { name, type };
    }
  }

  return null;
}

async function getDatabaseStatus(
  client: Client,
  databaseId: string,
): Promise<NotionDatabaseStatus> {
  const databaseResponse = (await client.databases.retrieve({
    database_id: databaseId,
  })) as unknown;

  const databaseRecord = readRecord(databaseResponse);
  const dataSources = Array.isArray(databaseRecord?.["data_sources"])
    ? ((databaseRecord?.["data_sources"] as unknown[]) ?? [])
    : [];
  const dataSourceId =
    readString(readRecord(dataSources[0])?.["id"]) ??
    readString(readRecord(databaseRecord?.["data_source"])?.["id"]);

  if (!dataSourceId) {
    throw new Error("The configured Notion database does not expose a queryable data source.");
  }

  const dataSourceResponse = (await client.dataSources.retrieve({
    data_source_id: dataSourceId,
  })) as unknown;

  const dataSourceRecord = readRecord(dataSourceResponse);
  const properties = readRecord(dataSourceRecord?.["properties"]);
  const titleProperty = findDatabaseTitlePropertyName(properties);
  if (!titleProperty) {
    throw new Error("The configured Notion database does not expose a title property.");
  }

  const title = Array.isArray(databaseRecord?.["title"])
    ? readTitleParts(databaseRecord?.["title"])
    : "";

  return {
    databaseTitle: title || null,
    dataSourceId,
    titleProperty,
    tagProperty: findDatabaseTagProperty(properties),
  };
}

function getPageTitle(result: UnknownRecord, titleProperty: string): string {
  const properties = readRecord(result["properties"]);
  const titleValue = readRecord(properties?.[titleProperty])?.["title"];
  return readTitleParts(titleValue) || "Untitled page";
}

async function getPageExcerpt(client: Client, pageId: string): Promise<string | null> {
  const response = (await client.blocks.children.list({
    block_id: pageId,
    page_size: 20,
  })) as unknown;

  const blocks = Array.isArray(readRecord(response)?.["results"])
    ? ((readRecord(response)?.["results"] as unknown[]) ?? [])
    : [];

  const plainText = extractPlainTextFromNotionBlocks(blocks);
  if (!plainText) return null;
  return truncateNotionExcerpt(plainText, 240);
}

function scoreSearchMatch(query: string, text: string): number {
  const needle = query.trim().toLowerCase();
  const hay = text.trim().toLowerCase();
  if (!needle || !hay) return 0;
  if (needle === hay) return 100;
  if (hay.startsWith(needle)) return 85;
  if (hay.includes(needle)) return 70;
  return 50;
}

export async function searchNotionPages(args: {
  client: Client;
  databaseId: string;
  query: string;
  limit?: number;
}): Promise<NotionSearchResult[]> {
  const limit = Math.min(Math.max(args.limit ?? 5, 1), 10);
  const query = args.query.trim();
  if (!query) return [];

  const status = await getDatabaseStatus(args.client, args.databaseId);

  const queryInput: QueryDataSourceParameters = {
    data_source_id: status.dataSourceId,
    filter: {
      property: status.titleProperty,
      title: {
        contains: query,
      },
    },
    page_size: Math.min(limit * 2, 20),
    result_type: "page",
  };

  const response = (await args.client.dataSources.query(queryInput)) as unknown;
  const results = Array.isArray(readRecord(response)?.["results"])
    ? ((readRecord(response)?.["results"] as unknown[]) ?? [])
    : [];

  const pages = results
    .map((item) => readRecord(item))
    .filter((item): item is UnknownRecord => Boolean(item))
    .filter((item) => readString(item["object"]) === "page");

  const scored = pages
    .map((page) => ({
      page,
      title: getPageTitle(page, status.titleProperty),
    }))
    .map((entry) => ({
      ...entry,
      score: scoreSearchMatch(query, entry.title),
    }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  const excerpts = await Promise.all(
    scored.map((entry) => getPageExcerpt(args.client, readString(entry.page["id"]) ?? "")),
  );

  return scored.map((entry, index) => ({
    id: readString(entry.page["id"]) ?? "",
    title: entry.title,
    url: readString(entry.page["url"]) ?? "",
    excerpt: excerpts[index] ?? null,
    lastEditedTime: readString(entry.page["last_edited_time"]),
  }));
}

export async function getNotionDatabaseStatus(args: {
  client: Client;
  databaseId: string;
}): Promise<NotionDatabaseStatus> {
  return getDatabaseStatus(args.client, args.databaseId);
}

export async function createNotionPage(args: {
  client: Client;
  databaseId: string;
  title: string;
  content?: string | null;
  tags?: string[];
}): Promise<{ id: string; title: string; url: string }> {
  const title = args.title.trim();
  if (!title) throw new Error("Page title cannot be empty.");

  const status = await getDatabaseStatus(args.client, args.databaseId);

  const properties: CreatePageParameters["properties"] = {
    [status.titleProperty]: {
      title: [
        {
          type: "text",
          text: { content: title.slice(0, 200) },
        },
      ],
    },
  };

  const cleanedTags = (args.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  if (status.tagProperty && cleanedTags.length > 0) {
    if (status.tagProperty.type === "multi_select") {
      properties[status.tagProperty.name] = {
        multi_select: cleanedTags.slice(0, 10).map((tag) => ({ name: tag.slice(0, 100) })),
      };
    } else if (status.tagProperty.type === "select") {
      properties[status.tagProperty.name] = {
        select: { name: cleanedTags[0].slice(0, 100) },
      };
    } else {
      properties[status.tagProperty.name] = {
        rich_text: [
          {
            type: "text",
            text: { content: cleanedTags.join(", ").slice(0, 1800) },
          },
        ],
      };
    }
  }

  const content = args.content?.trim() ?? "";
  const children: CreatePageParameters["children"] =
    content.length > 0
      ? [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: content.slice(0, 1900),
                  },
                },
              ],
            },
          },
        ]
      : [];

  const input: CreatePageParameters = {
    parent: { data_source_id: status.dataSourceId },
    properties,
    children,
  };

  const response = (await args.client.pages.create(input)) as unknown;
  const record = readRecord(response);

  return {
    id: readString(record?.["id"]) ?? "",
    title,
    url: readString(record?.["url"]) ?? "",
  };
}
