import { describe, expect, it, vi } from "vitest";
import { searchFaqEntriesInMemory, searchWiki } from "./wikiSearch.js";

describe("wikiSearch", () => {
  it("prefers exact FAQ key and title matches", () => {
    const results = searchFaqEntriesInMemory(
      [
        {
          key: "deploy-guide",
          title: "Deploy Guide",
          body: "How to deploy the app.",
          tags: ["deploy", "ops"],
          createdAt: "",
          updatedAt: "",
          createdBy: "u1",
          updatedBy: "u1",
          usageCount: 1,
        },
        {
          key: "general-help",
          title: "General Help",
          body: "Deployment notes are here too.",
          tags: ["support"],
          createdAt: "",
          updatedAt: "",
          createdBy: "u1",
          updatedBy: "u1",
          usageCount: 10,
        },
      ],
      "deploy-guide",
      5,
    );

    expect(results[0]?.key).toBe("deploy-guide");
  });

  it("merges notion results when a notion search runner is provided", async () => {
    const notionSearch = vi.fn().mockResolvedValue([
      {
        id: "page-1",
        title: "Deploying from Notion",
        excerpt: "This page explains the deploy flow.",
        url: "https://notion.so/page-1",
      },
    ]);

    const result = await searchWiki({
      query: "deploy",
      source: "notion",
      limit: 5,
      notionSearch,
    });

    expect(notionSearch).toHaveBeenCalledOnce();
    expect(result.results[0]?.source).toBe("notion");
    expect(result.notices).toHaveLength(0);
  });

  it("returns a helpful notice when notion-only search is requested without config", async () => {
    const result = await searchWiki({
      query: "deploy",
      source: "notion",
      limit: 5,
    });

    expect(result.results).toHaveLength(0);
    expect(result.notices[0]).toContain("Notion is not configured yet");
  });
});
