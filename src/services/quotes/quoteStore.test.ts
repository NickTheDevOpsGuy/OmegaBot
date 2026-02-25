// src/services/quotes/quoteStore.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../test/dbTestUtils.js";
import { addQuote, listRecentQuotesForAutocomplete } from "./quoteStore.js";

useInMemoryDb();

describe("quoteStore", () => {
  it("addQuote returns incremented id", () => {
    const id1 = addQuote("g1", "author1", "Hello", "adder1");
    const id2 = addQuote("g1", "author1", "World", "adder1");
    expect(id1).toBe(1);
    expect(id2).toBe(2);
  });

  it("listRecentQuotesForAutocomplete returns quotes in desc order", () => {
    addQuote("g1", "a1", "First", "u1");
    addQuote("g1", "a1", "Second", "u1");
    addQuote("g1", "a1", "Third", "u1");

    const list = listRecentQuotesForAutocomplete("g1");
    expect(list).toHaveLength(3);
    expect(list[0].id).toBe(3);
    expect(list[0].preview).toBe("Third");
    expect(list[1].id).toBe(2);
    expect(list[2].id).toBe(1);
  });

  it("listRecentQuotesForAutocomplete truncates long text", () => {
    const long = "a".repeat(100);
    addQuote("g1", "a1", long, "u1");

    const list = listRecentQuotesForAutocomplete("g1");
    expect(list).toHaveLength(1);
    expect(list[0].preview.length).toBe(48); // 47 chars + "…"
    expect(list[0].preview.endsWith("…")).toBe(true);
  });

  it("listRecentQuotesForAutocomplete respects guild filter", () => {
    addQuote("g1", "a1", "In g1", "u1");
    addQuote("g2", "a1", "In g2", "u1");

    const list = listRecentQuotesForAutocomplete("g1");
    expect(list).toHaveLength(1);
    expect(list[0].preview).toBe("In g1");
  });

  it("listRecentQuotesForAutocomplete respects limit", () => {
    for (let i = 0; i < 30; i++) {
      addQuote("g1", "a1", `Quote ${i}`, "u1");
    }
    const list = listRecentQuotesForAutocomplete("g1", 10);
    expect(list).toHaveLength(10);
  });
});
