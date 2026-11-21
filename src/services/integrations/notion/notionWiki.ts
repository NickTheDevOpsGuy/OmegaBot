import { createRequire } from "node:module";
import { getContextLogger } from "../../core/logging/requestContext.js";
import { extractPlainTextFromNotionBlocks, truncateNotionExcerpt } from "./notionText.js";

const require = createRequire(import.meta.url);

type UnknownRecord = Record<string, unknown>;
type NotionRichTextRequest = {
  type: "text";
  text: { content: string };
};
type NotionPagePropertyValue =
  | {
      title: NotionRichTextRequest[];
      type?: "title";
    }
  | {
      rich_text: NotionRichTextRequest[];
      type?: "rich_text";
    }
  | {
      select: { name: string } | null;
      type?: "select";
    }
  | {
      multi_select: Array<{ name: string }>;
      type?: "multi_select";
    }
  | {
      number: number | null;
      type?: "number";
    }
  | {
      checkbox: boolean;
      type?: "checkbox";
    };
type NotionParagraphBlockRequest = {
  object: "block";
  type: "paragraph";
  paragraph: {
    rich_text: NotionRichTextRequest[];
  };
};
type CreatePageParameters = {
  parent: { data_source_id: string; type?: "data_source_id" };
  properties: Record<string, NotionPagePropertyValue>;
  children?: NotionParagraphBlockRequest[];
};
type QueryDataSourceParameters = {
  data_source_id: string;
  filter?: UnknownRecord;
  page_size?: number;
  sorts?: Array<
    | {
        property: string;
        direction: "ascending" | "descending";
      }
    | {
        timestamp: "created_time" | "last_edited_time";
        direction: "ascending" | "descending";
      }
  >;
  result_type?: "page" | "data_source";
  start_cursor?: string;
};
type ListBlockChildrenParameters = {
  block_id: string;
  page_size?: number;
  start_cursor?: string;
};
type NotionClient = {
  databases: {
    retrieve(args: { database_id: string }): Promise<unknown>;
  };
  dataSources: {
    retrieve(args: { data_source_id: string }): Promise<unknown>;
    query(args: QueryDataSourceParameters): Promise<unknown>;
  };
  blocks: {
    children: {
      list(args: ListBlockChildrenParameters): Promise<unknown>;
    };
  };
  pages: {
    create(args: CreatePageParameters): Promise<unknown>;
  };
};
type NotionClientConstructor = new (args: { auth: string }) => NotionClient;

export type NotionSearchResult = {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  imageUrl: string | null;
  lastEditedTime: string | null;
  lastEditedBy: string | null;
  relevanceScore: number;
  tags: string[];
};

export type NotionPageSummary = {
  id: string;
  title: string;
  url: string;
  tags: string[];
  excerpt: string | null;
  imageUrl: string | null;
  lastEditedTime: string | null;
};

export type NotionDatabaseStatus = {
  databaseTitle: string | null;
  dataSourceId: string;
  titleProperty: string;
  tagProperty: { name: string; type: "multi_select" | "select" | "rich_text" } | null;
};

export type NotionTemplatePropertyInput = {
  property: string;
  type: "rich_text" | "select" | "multi_select" | "number" | "checkbox";
  value: string;
};

const NOTION_PREVIEW_BLOCK_LIMIT = 40;
const NOTION_PREVIEW_CHILD_PAGE_SIZE = 20;
const NOTION_PREVIEW_NESTED_DEPTH = 3;
const NOTION_STATUS_CACHE_MS = 5 * 60_000;
const NOTION_PAGE_INDEX_CACHE_MS = 60_000;
const NOTION_PAGE_INDEX_LIMIT = 100;

type IndexedNotionPage = {
  id: string;
  title: string;
  url: string;
  tags: string[];
  summaryExcerpt: string | null;
  imageUrl: string | null;
  lastEditedTime: string | null;
  lastEditedBy: string | null;
};

type CachedNotionStatus = {
  expiresAt: number;
  status: NotionDatabaseStatus;
};

type CachedNotionPageIndex = {
  expiresAt: number;
  pages: IndexedNotionPage[];
};

const notionStatusCache = new Map<string, CachedNotionStatus>();
const notionPageIndexCache = new Map<string, CachedNotionPageIndex>();

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function parseJsonRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return readRecord(parsed);
  } catch {
    return null;
  }
}

function summarizeNotionError(err: unknown): {
  message: string;
  code: string | null;
  status: number | null;
  hint: string | null;
  rawMessage: string | null;
} {
  const record = readRecord(err);
  const bodyRecord = readRecord(record?.["body"]) ?? parseJsonRecord(record?.["body"]);
  const code = readString(record?.["code"]) ?? readString(bodyRecord?.["code"]);
  const status =
    typeof record?.["status"] === "number"
      ? record["status"]
      : typeof bodyRecord?.["status"] === "number"
        ? bodyRecord["status"]
        : null;
  const rawMessage =
    readString(record?.["message"]) ?? readString(bodyRecord?.["message"]) ?? null;

  if (code === "object_not_found") {
    return {
      message:
        "Notion could not find that database. The ID may be wrong, the integration may not have access, or the URL may point to a page instead of a database.",
      code,
      status,
      hint: "Check NOTION_DATABASE_ID, then open the database in Notion and share it with the integration.",
      rawMessage,
    };
  }

  if (code === "unauthorized") {
    return {
      message:
        "Notion rejected the request because the integration token is not authorized.",
      code,
      status,
      hint: "Verify NOTION_TOKEN and confirm the integration still has access to the database.",
      rawMessage,
    };
  }

  if (code === "validation_error") {
    return {
      message:
        "Notion rejected the request because the database ID or request shape is invalid.",
      code,
      status,
      hint: "Make sure NOTION_DATABASE_ID is the 32-character database ID from the database URL, not a regular page URL.",
      rawMessage,
    };
  }

  return {
    message: rawMessage ?? "Unknown Notion API error.",
    code,
    status,
    hint: null,
    rawMessage,
  };
}

function readTitleParts(value: unknown): string {
  if (!Array.isArray(value)) return "";

  return value
    .map((part) => readString(readRecord(part)?.["plain_text"]))
    .filter((part): part is string => Boolean(part))
    .join("")
    .trim();
}

function loadNotionClientConstructor(): NotionClientConstructor {
  const loaded = require("@notionhq/client") as {
    Client?: NotionClientConstructor;
  };

  if (!loaded.Client) {
    throw new Error(
      "Failed to load @notionhq/client. Run `npm install` in the project root.",
    );
  }

  return loaded.Client;
}

export function createNotionClient(token: string): NotionClient {
  const Client = loadNotionClientConstructor();
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

export function findDatabaseTagProperty(
  properties: unknown,
): NotionDatabaseStatus["tagProperty"] {
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
  client: NotionClient,
  databaseId: string,
): Promise<NotionDatabaseStatus> {
  const log = getContextLogger();
  const cached = notionStatusCache.get(databaseId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.status;
  }

  let databaseResponse: unknown;
  try {
    databaseResponse = (await client.databases.retrieve({
      database_id: databaseId,
    })) as unknown;
  } catch (err) {
    const summary = summarizeNotionError(err);
    log.error(
      {
        err,
        databaseId,
        notionCode: summary.code,
        notionStatus: summary.status,
        notionHint: summary.hint,
        notionRawMessage: summary.rawMessage,
      },
      "[notion] database lookup failed: %s",
      summary.message,
    );
    throw new Error(summary.message);
  }

  const databaseRecord = readRecord(databaseResponse);
  const dataSources = Array.isArray(databaseRecord?.["data_sources"])
    ? ((databaseRecord?.["data_sources"] as unknown[]) ?? [])
    : [];
  const dataSourceId =
    readString(readRecord(dataSources[0])?.["id"]) ??
    readString(readRecord(databaseRecord?.["data_source"])?.["id"]);

  if (!dataSourceId) {
    log.error(
      { databaseId, databaseKeys: Object.keys(databaseRecord ?? {}) },
      "[notion] database lookup failed: configured object is not a queryable database",
    );
    throw new Error(
      "The configured Notion database does not expose a queryable data source.",
    );
  }

  let dataSourceResponse: unknown;
  try {
    dataSourceResponse = (await client.dataSources.retrieve({
      data_source_id: dataSourceId,
    })) as unknown;
  } catch (err) {
    const summary = summarizeNotionError(err);
    log.error(
      {
        err,
        databaseId,
        dataSourceId,
        notionCode: summary.code,
        notionStatus: summary.status,
        notionHint: summary.hint,
        notionRawMessage: summary.rawMessage,
      },
      "[notion] data source lookup failed: %s",
      summary.message,
    );
    throw new Error(summary.message);
  }

  const dataSourceRecord = readRecord(dataSourceResponse);
  const properties = readRecord(dataSourceRecord?.["properties"]);
  const titleProperty = findDatabaseTitlePropertyName(properties);
  if (!titleProperty) {
    throw new Error("The configured Notion database does not expose a title property.");
  }

  const title = Array.isArray(databaseRecord?.["title"])
    ? readTitleParts(databaseRecord?.["title"])
    : "";

  const status = {
    databaseTitle: title || null,
    dataSourceId,
    titleProperty,
    tagProperty: findDatabaseTagProperty(properties),
  };
  log.debug(
    {
      databaseId,
      dataSourceId,
      titleProperty,
      tagProperty: status.tagProperty?.name ?? null,
    },
    "[notion] resolved database status",
  );
  notionStatusCache.set(databaseId, {
    expiresAt: Date.now() + NOTION_STATUS_CACHE_MS,
    status,
  });
  return status;
}

function getPageTitle(result: UnknownRecord, titleProperty: string): string {
  const properties = readRecord(result["properties"]);
  const titleValue = readRecord(properties?.[titleProperty])?.["title"];
  return readTitleParts(titleValue) || "Untitled page";
}

function getPageSummaryExcerpt(result: UnknownRecord): string | null {
  const properties = readRecord(result["properties"]);
  if (!properties) return null;

  for (const [name, value] of Object.entries(properties)) {
    if (!/description/i.test(name)) continue;

    const property = readRecord(value);
    if (!property) continue;

    const richText = readTitleParts(property["rich_text"]);
    if (richText) return truncateNotionExcerpt(richText, 240);

    const titleText = readTitleParts(property["title"]);
    if (titleText) return truncateNotionExcerpt(titleText, 240);
  }

  for (const [name, value] of Object.entries(properties)) {
    if (!/summary|preview|excerpt|description/i.test(name)) continue;

    const property = readRecord(value);
    if (!property) continue;

    const richText = readTitleParts(property["rich_text"]);
    if (richText) return truncateNotionExcerpt(richText, 240);

    const titleText = readTitleParts(property["title"]);
    if (titleText) return truncateNotionExcerpt(titleText, 240);

    const selectName = readString(readRecord(property["select"])?.["name"]);
    if (selectName) return truncateNotionExcerpt(selectName, 240);
  }

  return null;
}

function getPropertyImageUrl(property: UnknownRecord): string | null {
  const fileEntries = Array.isArray(property["files"])
    ? (property["files"] as unknown[])
    : [];
  for (const fileEntry of fileEntries) {
    const file = readRecord(fileEntry);
    if (!file) continue;
    const externalUrl = readString(readRecord(file["external"])?.["url"]);
    if (externalUrl) return externalUrl;
    const notionFileUrl = readString(readRecord(file["file"])?.["url"]);
    if (notionFileUrl) return notionFileUrl;
  }

  const directUrl = readString(property["url"]);
  if (directUrl) return directUrl;

  const richText = readTitleParts(property["rich_text"]);
  if (richText && /^https?:\/\//i.test(richText)) return richText;

  return null;
}

function getPageImageUrl(result: UnknownRecord): string | null {
  const cover = readRecord(result["cover"]);
  if (cover) {
    const externalUrl = readString(readRecord(cover["external"])?.["url"]);
    if (externalUrl) return externalUrl;
    const notionFileUrl = readString(readRecord(cover["file"])?.["url"]);
    if (notionFileUrl) return notionFileUrl;
  }

  const properties = readRecord(result["properties"]);
  if (!properties) return null;

  for (const [name, value] of Object.entries(properties)) {
    if (!/image|thumbnail|cover|banner|hero/i.test(name)) continue;
    const property = readRecord(value);
    if (!property) continue;
    const imageUrl = getPropertyImageUrl(property);
    if (imageUrl) return imageUrl;
  }

  return null;
}

function getPageLastEditedBy(result: UnknownRecord): string | null {
  const personName = readString(
    readRecord(readRecord(result["last_edited_by"])?.["person"])?.["email"],
  );
  if (personName) return personName;
  return readString(readRecord(result["last_edited_by"])?.["name"]);
}

function getPageTags(
  result: UnknownRecord,
  tagProperty: NotionDatabaseStatus["tagProperty"],
): string[] {
  if (!tagProperty) return [];

  const properties = readRecord(result["properties"]);
  if (!properties) return [];

  const property = readRecord(properties[tagProperty.name]);
  if (!property) return [];

  if (tagProperty.type === "multi_select") {
    const values = Array.isArray(property["multi_select"])
      ? (property["multi_select"] as unknown[])
      : [];
    return values
      .map((entry) => readString(readRecord(entry)?.["name"]))
      .filter((entry): entry is string => Boolean(entry));
  }

  if (tagProperty.type === "select") {
    const value = readString(readRecord(property["select"])?.["name"]);
    return value ? [value] : [];
  }

  const richText = readTitleParts(property["rich_text"]);
  if (!richText) return [];

  return richText
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toIndexedNotionPage(
  page: UnknownRecord,
  status: NotionDatabaseStatus,
): IndexedNotionPage {
  return {
    id: readString(page["id"]) ?? "",
    title: getPageTitle(page, status.titleProperty),
    url: readString(page["url"]) ?? "",
    tags: getPageTags(page, status.tagProperty),
    summaryExcerpt: getPageSummaryExcerpt(page),
    imageUrl: getPageImageUrl(page),
    lastEditedTime: readString(page["last_edited_time"]),
    lastEditedBy: getPageLastEditedBy(page),
  };
}

function dedupeNotionPages(pages: IndexedNotionPage[]): IndexedNotionPage[] {
  const unique = new Map<string, IndexedNotionPage>();

  for (const page of pages) {
    if (!page.id) continue;
    const existing = unique.get(page.id);
    if (!existing) {
      unique.set(page.id, page);
      continue;
    }

    unique.set(page.id, {
      ...existing,
      ...page,
      tags: page.tags.length > 0 ? page.tags : existing.tags,
      summaryExcerpt: page.summaryExcerpt ?? existing.summaryExcerpt,
      imageUrl: page.imageUrl ?? existing.imageUrl,
      lastEditedTime: page.lastEditedTime ?? existing.lastEditedTime,
      lastEditedBy: page.lastEditedBy ?? existing.lastEditedBy,
      title: page.title || existing.title,
      url: page.url || existing.url,
    });
  }

  return [...unique.values()];
}

function getBlockId(block: unknown): string | null {
  return readString(readRecord(block)?.["id"]);
}

function blockHasChildren(block: unknown): boolean {
  return readRecord(block)?.["has_children"] === true;
}

async function listBlockChildren(
  client: NotionClient,
  blockId: string,
  limit: number,
): Promise<unknown[]> {
  const blocks: unknown[] = [];
  let cursor: string | undefined;

  while (blocks.length < limit) {
    const response = (await client.blocks.children.list({
      block_id: blockId,
      page_size: Math.min(NOTION_PREVIEW_CHILD_PAGE_SIZE, limit - blocks.length),
      start_cursor: cursor,
    })) as unknown;

    const record = readRecord(response);
    const pageBlocks = Array.isArray(record?.["results"])
      ? ((record?.["results"] as unknown[]) ?? [])
      : [];
    blocks.push(...pageBlocks.slice(0, limit - blocks.length));

    const hasMore = record?.["has_more"] === true;
    const nextCursor = readString(record?.["next_cursor"]);
    if (!hasMore || !nextCursor) break;
    cursor = nextCursor;
  }

  return blocks;
}

async function collectPreviewBlocks(
  client: NotionClient,
  blockId: string,
  limit: number,
  nestedDepthRemaining: number,
): Promise<unknown[]> {
  const directBlocks = await listBlockChildren(client, blockId, limit);
  const collected: unknown[] = [];

  for (const block of directBlocks) {
    if (collected.length >= limit) break;
    collected.push(block);

    if (!blockHasChildren(block) || nestedDepthRemaining <= 0) continue;

    const childBlockId = getBlockId(block);
    if (!childBlockId) continue;

    const remaining = limit - collected.length;
    if (remaining <= 0) break;

    const nestedBlocks = await collectPreviewBlocks(
      client,
      childBlockId,
      remaining,
      nestedDepthRemaining - 1,
    );
    collected.push(...nestedBlocks.slice(0, remaining));
  }

  return collected;
}

async function getPageExcerpt(
  client: NotionClient,
  pageId: string,
): Promise<string | null> {
  const blocks = await collectPreviewBlocks(
    client,
    pageId,
    NOTION_PREVIEW_BLOCK_LIMIT,
    NOTION_PREVIEW_NESTED_DEPTH,
  );
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
  return 0;
}

function compareNotionPagesByRecent(a: IndexedNotionPage, b: IndexedNotionPage): number {
  const aTime = a.lastEditedTime ? Date.parse(a.lastEditedTime) : 0;
  const bTime = b.lastEditedTime ? Date.parse(b.lastEditedTime) : 0;
  return bTime - aTime || a.title.localeCompare(b.title);
}

function scoreNotionPage(query: string, page: IndexedNotionPage): number {
  const titleScore = scoreSearchMatch(query, page.title);
  const summaryScore = page.summaryExcerpt
    ? scoreSearchMatch(query, page.summaryExcerpt)
    : 0;
  const tagScore = Math.max(
    0,
    ...page.tags.map((tag) => {
      const score = scoreSearchMatch(query, tag);
      return score > 0 ? score + 5 : 0;
    }),
  );

  return Math.max(titleScore, summaryScore > 0 ? summaryScore - 10 : 0, tagScore);
}

async function queryNotionPages(args: {
  client: NotionClient;
  dataSourceId: string;
  filter?: UnknownRecord;
  limit: number;
  sorts?: QueryDataSourceParameters["sorts"];
}): Promise<UnknownRecord[]> {
  const pages: UnknownRecord[] = [];
  let cursor: string | undefined;

  while (pages.length < args.limit) {
    let response: unknown;
    try {
      response = (await args.client.dataSources.query({
        data_source_id: args.dataSourceId,
        filter: args.filter,
        page_size: Math.min(args.limit - pages.length, 100),
        result_type: "page",
        sorts: args.sorts,
        start_cursor: cursor,
      })) as unknown;
    } catch (err) {
      const summary = summarizeNotionError(err);
      throw new Error(summary.message);
    }

    const record = readRecord(response);
    const chunk = Array.isArray(record?.["results"])
      ? ((record?.["results"] as unknown[]) ?? [])
      : [];

    for (const item of chunk) {
      const page = readRecord(item);
      if (!page || readString(page["object"]) !== "page") continue;
      pages.push(page);
      if (pages.length >= args.limit) break;
    }

    const hasMore = record?.["has_more"] === true;
    const nextCursor = readString(record?.["next_cursor"]);
    if (!hasMore || !nextCursor) break;
    cursor = nextCursor;
  }

  return pages;
}

async function getNotionPageIndex(args: {
  client: NotionClient;
  databaseId: string;
}): Promise<{ pages: IndexedNotionPage[]; status: NotionDatabaseStatus }> {
  const status = await getDatabaseStatus(args.client, args.databaseId);
  const cached = notionPageIndexCache.get(args.databaseId);
  if (cached && cached.expiresAt > Date.now()) {
    return { pages: cached.pages, status };
  }

  const rawPages = await queryNotionPages({
    client: args.client,
    dataSourceId: status.dataSourceId,
    limit: NOTION_PAGE_INDEX_LIMIT,
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
  });

  const pages = dedupeNotionPages(
    rawPages.map((page) => toIndexedNotionPage(page, status)),
  ).sort(compareNotionPagesByRecent);

  notionPageIndexCache.set(args.databaseId, {
    expiresAt: Date.now() + NOTION_PAGE_INDEX_CACHE_MS,
    pages,
  });

  return { pages, status };
}

async function getNotionSearchCandidates(args: {
  client: NotionClient;
  databaseId: string;
  query: string;
}): Promise<IndexedNotionPage[]> {
  const { pages: indexedPages, status } = await getNotionPageIndex(args);
  const queryText = args.query.trim();
  if (!queryText) return indexedPages;

  const titleMatches = await queryNotionPages({
    client: args.client,
    dataSourceId: status.dataSourceId,
    filter: {
      property: status.titleProperty,
      title: {
        contains: queryText,
      },
    },
    limit: 25,
  });

  return dedupeNotionPages([
    ...titleMatches.map((page) => toIndexedNotionPage(page, status)),
    ...indexedPages,
  ]);
}

function parseBooleanInput(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "yes", "y", "1", "on"].includes(normalized)) return true;
  if (["false", "no", "n", "0", "off"].includes(normalized)) return false;
  return null;
}

export async function searchNotionPages(args: {
  client: NotionClient;
  databaseId: string;
  query: string;
  limit?: number;
}): Promise<NotionSearchResult[]> {
  const log = getContextLogger();
  const limit = Math.min(Math.max(args.limit ?? 5, 1), 10);
  const query = args.query.trim();
  if (!query) return [];

  let candidates: IndexedNotionPage[];
  try {
    candidates = await getNotionSearchCandidates(args);
  } catch (err) {
    const status = await getDatabaseStatus(args.client, args.databaseId).catch(
      () => null,
    );
    const summary = summarizeNotionError(err);
    log.error(
      {
        err,
        databaseId: args.databaseId,
        dataSourceId: status?.dataSourceId ?? null,
        query,
        titleProperty: status?.titleProperty ?? null,
        notionCode: summary.code,
        notionStatus: summary.status,
        notionHint: summary.hint,
        notionRawMessage: summary.rawMessage,
      },
      "[notion] search query failed: %s",
      summary.message,
    );
    throw new Error(summary.message);
  }

  const scored = candidates
    .map((page) => ({
      page,
      score: scoreNotionPage(query, page),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || compareNotionPagesByRecent(a.page, b.page))
    .slice(0, limit);

  const results = await Promise.all(
    scored.map(async (entry) => {
      const excerpt =
        entry.page.summaryExcerpt ?? (await getPageExcerpt(args.client, entry.page.id));

      return {
        id: entry.page.id,
        title: entry.page.title,
        url: entry.page.url,
        excerpt,
        imageUrl: entry.page.imageUrl,
        lastEditedTime: entry.page.lastEditedTime,
        lastEditedBy: entry.page.lastEditedBy,
        relevanceScore: entry.score,
        tags: entry.page.tags,
      };
    }),
  );

  log.info(
    { databaseId: args.databaseId, query, limit, resultCount: results.length },
    "[notion] searched pages",
  );
  return results;
}

export async function getNotionPageTitleSuggestions(args: {
  client: NotionClient;
  databaseId: string;
  query: string;
  limit?: number;
}): Promise<string[]> {
  const limit = Math.min(Math.max(args.limit ?? 10, 1), 25);
  const query = args.query.trim();
  const candidates = await getNotionSearchCandidates(args);

  return candidates
    .map((page) => ({
      title: page.title,
      score: query ? scoreSearchMatch(query, page.title) : 1,
      lastEditedTime: page.lastEditedTime,
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.lastEditedTime ? Date.parse(b.lastEditedTime) : 0) -
          (a.lastEditedTime ? Date.parse(a.lastEditedTime) : 0) ||
        a.title.localeCompare(b.title),
    )
    .map((entry) => entry.title)
    .filter((title, index, titles) => titles.indexOf(title) === index)
    .slice(0, limit);
}

export async function getNotionTagSuggestions(args: {
  client: NotionClient;
  databaseId: string;
  query: string;
  limit?: number;
}): Promise<string[]> {
  const limit = Math.min(Math.max(args.limit ?? 10, 1), 25);
  const query = args.query.trim().toLowerCase();
  const { pages } = await getNotionPageIndex(args);

  return [...new Set(pages.flatMap((page) => page.tags))]
    .filter((tag) => (!query ? true : tag.toLowerCase().includes(query)))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}

export async function getNotionRecentPages(args: {
  client: NotionClient;
  databaseId: string;
  limit?: number;
}): Promise<NotionPageSummary[]> {
  const limit = Math.min(Math.max(args.limit ?? 5, 1), 10);
  const { pages } = await getNotionPageIndex(args);

  return Promise.all(
    pages.slice(0, limit).map(async (page) => ({
      id: page.id,
      title: page.title,
      url: page.url,
      tags: page.tags,
      excerpt: page.summaryExcerpt ?? (await getPageExcerpt(args.client, page.id)),
      imageUrl: page.imageUrl,
      lastEditedTime: page.lastEditedTime,
    })),
  );
}

export async function getNotionPagesByTag(args: {
  client: NotionClient;
  databaseId: string;
  tag: string;
  limit?: number;
}): Promise<NotionPageSummary[]> {
  const limit = Math.min(Math.max(args.limit ?? 5, 1), 10);
  const tag = args.tag.trim().toLowerCase();
  if (!tag) return [];

  const { pages } = await getNotionPageIndex(args);
  const matches = pages
    .filter((page) => page.tags.some((entry) => entry.toLowerCase() === tag))
    .sort(compareNotionPagesByRecent)
    .slice(0, limit);

  return Promise.all(
    matches.map(async (page) => ({
      id: page.id,
      title: page.title,
      url: page.url,
      tags: page.tags,
      excerpt: page.summaryExcerpt ?? (await getPageExcerpt(args.client, page.id)),
      imageUrl: page.imageUrl,
      lastEditedTime: page.lastEditedTime,
    })),
  );
}

export async function openNotionPage(args: {
  client: NotionClient;
  databaseId: string;
  title: string;
}): Promise<NotionPageSummary | null> {
  const title = args.title.trim();
  if (!title) return null;

  const candidates = await getNotionSearchCandidates({
    client: args.client,
    databaseId: args.databaseId,
    query: title,
  });

  const match = candidates
    .map((page) => ({
      page,
      score: scoreSearchMatch(title, page.title),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) => b.score - a.score || compareNotionPagesByRecent(a.page, b.page),
    )[0]?.page;

  if (!match) return null;

  return {
    id: match.id,
    title: match.title,
    url: match.url,
    tags: match.tags,
    excerpt: match.summaryExcerpt ?? (await getPageExcerpt(args.client, match.id)),
    imageUrl: match.imageUrl,
    lastEditedTime: match.lastEditedTime,
  };
}

export async function getRandomNotionPage(args: {
  client: NotionClient;
  databaseId: string;
  tag?: string | null;
}): Promise<NotionPageSummary | null> {
  const tag = args.tag?.trim().toLowerCase() ?? "";
  const { pages } = await getNotionPageIndex(args);
  const pool = tag
    ? pages.filter((page) => page.tags.some((entry) => entry.toLowerCase() === tag))
    : pages;

  if (pool.length === 0) return null;

  const page = pool[Math.floor(Math.random() * pool.length)]!;

  return {
    id: page.id,
    title: page.title,
    url: page.url,
    tags: page.tags,
    excerpt: page.summaryExcerpt ?? (await getPageExcerpt(args.client, page.id)),
    imageUrl: page.imageUrl,
    lastEditedTime: page.lastEditedTime,
  };
}

export function getNotionDatabaseStatus(args: {
  client: NotionClient;
  databaseId: string;
}): Promise<NotionDatabaseStatus> {
  return getDatabaseStatus(args.client, args.databaseId);
}

export async function createNotionPage(args: {
  client: NotionClient;
  databaseId: string;
  title: string;
  content?: string | null;
  tags?: string[];
  templateProperties?: NotionTemplatePropertyInput[];
}): Promise<{ id: string; title: string; url: string }> {
  const log = getContextLogger();
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
        multi_select: cleanedTags
          .slice(0, 10)
          .map((tag) => ({ name: tag.slice(0, 100) })),
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

  const templateProperties = (args.templateProperties ?? [])
    .map((item) => ({
      property: item.property.trim(),
      type: item.type,
      value: item.value.trim(),
    }))
    .filter((item) => item.property.length > 0 && item.value.length > 0);

  for (const item of templateProperties) {
    if (item.property === status.titleProperty) continue;

    if (item.type === "select") {
      properties[item.property] = { select: { name: item.value.slice(0, 100) } };
      continue;
    }

    if (item.type === "multi_select") {
      const values = item.value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 10)
        .map((name) => ({ name: name.slice(0, 100) }));
      if (values.length > 0) properties[item.property] = { multi_select: values };
      continue;
    }

    if (item.type === "number") {
      const value = Number(item.value);
      if (Number.isNaN(value)) {
        throw new Error(`Template field "${item.property}" expects a number.`);
      }
      properties[item.property] = { number: value };
      continue;
    }

    if (item.type === "checkbox") {
      const value = parseBooleanInput(item.value);
      if (value === null) {
        throw new Error(
          `Template field "${item.property}" expects yes/no (or true/false).`,
        );
      }
      properties[item.property] = { checkbox: value };
      continue;
    }

    properties[item.property] = {
      rich_text: [{ type: "text", text: { content: item.value.slice(0, 1800) } }],
    };
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

  let response: unknown;
  try {
    response = (await args.client.pages.create(input)) as unknown;
  } catch (err) {
    const summary = summarizeNotionError(err);
    log.error(
      {
        err,
        databaseId: args.databaseId,
        dataSourceId: status.dataSourceId,
        title,
        tagCount: cleanedTags.length,
        notionCode: summary.code,
        notionStatus: summary.status,
        notionHint: summary.hint,
        notionRawMessage: summary.rawMessage,
      },
      "[notion] create page failed: %s",
      summary.message,
    );
    throw new Error(summary.message);
  }
  const record = readRecord(response);

  const page = {
    id: readString(record?.["id"]) ?? "",
    title,
    url: readString(record?.["url"]) ?? "",
  };
  notionPageIndexCache.delete(args.databaseId);
  log.info(
    {
      databaseId: args.databaseId,
      pageId: page.id,
      title,
      hasContent: content.length > 0,
      tagCount: cleanedTags.length,
      templatePropertyCount: templateProperties.length,
    },
    "[notion] created page",
  );
  return page;
}
