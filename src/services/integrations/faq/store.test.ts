// src/services/faq/store.test.ts
//
// Tests for the FAQ SQLite persistence layer.

import { describe, it, expect } from "vitest";
import { useInMemoryDb } from "../../core/database/dbTestUtils.js";
import { loadStore, saveStore } from "./store.js";

describe("faq store", () => {
  useInMemoryDb();

  it("returns an empty store when no FAQ rows exist", async () => {
    const store = await loadStore();

    expect(store.version).toBe(1);
    expect(store.entries).toEqual({});
  });

  it("saveStore writes rows that loadStore can read back", async () => {
    const store = await loadStore();

    store.entries["hello"] = {
      key: "hello",
      title: "Hello",
      body: "World",
      tags: ["test"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system",
      usageCount: 0,
    };

    await saveStore(store);

    const reread = await loadStore();
    expect(reread.entries["hello"]?.title).toBe("Hello");
    expect(reread.entries["hello"]?.tags).toEqual(["test"]);
  });
});
