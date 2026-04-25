import { describe, expect, it, vi } from "vitest";
import {
  getNotionTagSuggestions,
  openNotionPage,
  searchNotionPages,
} from "./notionWiki.js";

function createBaseClient(overrides?: {
  queryResults?: unknown[];
  blockList?: (args: {
    block_id: string;
    page_size?: number;
    start_cursor?: string;
  }) => unknown;
}) {
  return {
    databases: {
      retrieve: vi.fn().mockResolvedValue({
        title: [{ plain_text: "Wiki" }],
        data_sources: [{ id: "ds_1" }],
      }),
    },
    dataSources: {
      retrieve: vi.fn().mockResolvedValue({
        properties: {
          Name: { type: "title" },
        },
      }),
      query: vi.fn().mockResolvedValue({
        results: overrides?.queryResults ?? [],
      }),
    },
    blocks: {
      children: {
        list: vi.fn().mockImplementation(async (args) => {
          const response = overrides?.blockList?.(args);
          return response ?? { results: [], has_more: false };
        }),
      },
    },
    pages: {
      create: vi.fn(),
    },
  };
}

describe("searchNotionPages", () => {
  it("prefers a summary property over fetching block previews", async () => {
    const client = createBaseClient({
      queryResults: [
        {
          object: "page",
          id: "page-1",
          url: "https://www.notion.so/page-1",
          properties: {
            Name: {
              title: [{ plain_text: "Capcut" }],
            },
            Summary: {
              rich_text: [{ plain_text: "Short curated summary" }],
            },
          },
        },
      ],
      blockList: () => {
        throw new Error("block previews should not be fetched when Summary exists");
      },
    });

    const results = await searchNotionPages({
      client: client as never,
      databaseId: "db_summary",
      query: "Capcut",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.excerpt).toBe("Short curated summary");
    expect(client.blocks.children.list).not.toHaveBeenCalled();
  });

  it("falls back to nested child block text when no summary property exists", async () => {
    const client = createBaseClient({
      queryResults: [
        {
          object: "page",
          id: "page-1",
          url: "https://www.notion.so/page-1",
          properties: {
            Name: {
              title: [{ plain_text: "Capcut" }],
            },
          },
        },
      ],
      blockList: ({ block_id }) => {
        if (block_id === "page-1") {
          return {
            results: [
              {
                id: "toggle-1",
                type: "toggle",
                has_children: true,
                toggle: {
                  rich_text: [],
                },
              },
            ],
            has_more: false,
          };
        }

        if (block_id === "toggle-1") {
          return {
            results: [
              {
                id: "paragraph-1",
                type: "paragraph",
                paragraph: {
                  rich_text: [{ plain_text: "Nested preview text" }],
                },
              },
            ],
            has_more: false,
          };
        }

        return { results: [], has_more: false };
      },
    });

    const results = await searchNotionPages({
      client: client as never,
      databaseId: "db_nested",
      query: "Capcut",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.excerpt).toBe("Nested preview text");
    expect(client.blocks.children.list).toHaveBeenCalledTimes(2);
  });

  it("matches pages by tag when the title does not contain the query", async () => {
    const client = createBaseClient({
      queryResults: [
        {
          object: "page",
          id: "page-1",
          url: "https://www.notion.so/page-1",
          last_edited_time: "2026-04-25T12:00:00.000Z",
          properties: {
            Name: {
              title: [{ plain_text: "Video Editing Guide" }],
            },
            Tags: {
              multi_select: [{ name: "Capcut" }, { name: "Editing" }],
            },
          },
        },
      ],
      blockList: () => ({ results: [], has_more: false }),
    });

    client.dataSources.retrieve = vi.fn().mockResolvedValue({
      properties: {
        Name: { type: "title" },
        Tags: { type: "multi_select" },
      },
    });

    const results = await searchNotionPages({
      client: client as never,
      databaseId: "db_tags",
      query: "Capcut",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("Video Editing Guide");
    expect(results[0]?.tags).toEqual(["Capcut", "Editing"]);
  });
});

describe("notion autocomplete helpers", () => {
  it("returns tag suggestions from the indexed page cache", async () => {
    const client = createBaseClient({
      queryResults: [
        {
          object: "page",
          id: "page-1",
          url: "https://www.notion.so/page-1",
          last_edited_time: "2026-04-25T12:00:00.000Z",
          properties: {
            Name: {
              title: [{ plain_text: "Capcut Guide" }],
            },
            Tags: {
              multi_select: [{ name: "Capcut" }, { name: "Video" }],
            },
          },
        },
      ],
    });

    client.dataSources.retrieve = vi.fn().mockResolvedValue({
      properties: {
        Name: { type: "title" },
        Tags: { type: "multi_select" },
      },
    });

    const tags = await getNotionTagSuggestions({
      client: client as never,
      databaseId: "db_tag_suggestions",
      query: "cap",
    });

    expect(tags).toContain("Capcut");
  });

  it("opens the best matching page title", async () => {
    const client = createBaseClient({
      queryResults: [
        {
          object: "page",
          id: "page-1",
          url: "https://www.notion.so/page-1",
          last_edited_time: "2026-04-25T12:00:00.000Z",
          properties: {
            Name: {
              title: [{ plain_text: "Capcut" }],
            },
            Summary: {
              rich_text: [{ plain_text: "Short curated summary" }],
            },
          },
        },
      ],
    });

    const page = await openNotionPage({
      client: client as never,
      databaseId: "db_open",
      title: "Capcut",
    });

    expect(page?.title).toBe("Capcut");
    expect(page?.excerpt).toBe("Short curated summary");
  });
});
