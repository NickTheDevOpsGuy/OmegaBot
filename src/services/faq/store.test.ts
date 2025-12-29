// src/services/faq/store.test.ts
//
// Tests for the FAQ persistence layer (store.ts).
//
// Goals:
// - Never touch your real repo ./data folder
// - Exercise real filesystem behavior in an isolated temp directory
// - Verify safe fallbacks when the store file is missing or malformed

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

type StoreModule = typeof import("./store.js");

let originalCwd = "";
let tempRoot = "";
let storePath = "";

/**
 * Import store.ts AFTER we switch cwd.
 * store.ts computes STORE_PATH at import time using process.cwd().
 */
async function importStoreFresh(): Promise<StoreModule> {
  vi.resetModules();
  return await import("./store.js");
}

function rmIfExists(p: string): void {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

beforeAll(() => {
  originalCwd = process.cwd();
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "omegabot-faq-store-"));
  process.chdir(tempRoot);

  storePath = path.join(process.cwd(), "data", "faqs.json");
});

afterAll(() => {
  process.chdir(originalCwd);
  rmIfExists(tempRoot);
});

beforeEach(() => {
  // Each test starts with a clean tempRoot/data folder.
  rmIfExists(path.join(process.cwd(), "data"));
});

describe("faq store", () => {
  it("creates the store file if missing", async () => {
    const { loadStore } = await importStoreFresh();

    expect(fs.existsSync(storePath)).toBe(false);

    const store = loadStore();

    expect(fs.existsSync(storePath)).toBe(true);
    expect(store.version).toBe(1);
    expect(store.entries).toEqual({});
  });

  it("falls back to empty store when JSON is malformed", async () => {
    const { loadStore, ensureStoreFile } = await importStoreFresh();

    ensureStoreFile();
    fs.writeFileSync(storePath, "not json", "utf8");

    const store = loadStore();

    expect(store.version).toBe(1);
    expect(store.entries).toEqual({});
  });

  it("falls back to empty store when shape is invalid", async () => {
    const { loadStore, ensureStoreFile } = await importStoreFresh();

    ensureStoreFile();

    // Wrong version + missing entries
    fs.writeFileSync(storePath, JSON.stringify({ version: 999 }, null, 2), "utf8");

    const store = loadStore();

    expect(store.version).toBe(1);
    expect(store.entries).toEqual({});
  });

  it("saveStore writes valid JSON that loadStore can read back", async () => {
    const { loadStore, saveStore } = await importStoreFresh();

    const store = loadStore();

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

    saveStore(store);

    const reread = loadStore();
    expect(reread.entries["hello"]?.title).toBe("Hello");
    expect(reread.entries["hello"]?.tags).toEqual(["test"]);
  });
});
