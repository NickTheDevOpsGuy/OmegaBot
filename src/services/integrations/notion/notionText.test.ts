import { describe, expect, it } from "vitest";
import {
  extractPlainTextFromNotionBlocks,
  truncateNotionExcerpt,
} from "./notionText.js";

describe("notionText", () => {
  it("extracts plain text from common block payloads", () => {
    const text = extractPlainTextFromNotionBlocks([
      {
        type: "paragraph",
        paragraph: {
          rich_text: [{ plain_text: "Hello" }, { plain_text: " world" }],
        },
      },
      {
        type: "callout",
        callout: {
          rich_text: [{ plain_text: "Callout body" }],
          caption: [{ plain_text: "caption" }],
        },
      },
      {
        type: "table_row",
        table_row: {
          cells: [[{ plain_text: "alpha" }], [{ plain_text: "beta" }]],
        },
      },
    ]);

    expect(text).toContain("Hello  world");
    expect(text).toContain("Callout body");
    expect(text).toContain("caption");
    expect(text).toContain("alpha | beta");
  });

  it("truncates long excerpts cleanly", () => {
    const excerpt = truncateNotionExcerpt("a".repeat(50), 20);
    expect(excerpt).toHaveLength(20);
    expect(excerpt.endsWith("...")).toBe(true);
  });
});
