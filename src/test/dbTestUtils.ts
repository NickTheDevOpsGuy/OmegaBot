// src/test/dbTestUtils.ts
import { afterEach, beforeEach } from "vitest";
import { closeDatabase, initDatabase } from "../services/database/db.js";

export function useInMemoryDb(): void {
  beforeEach(() => {
    process.env.DATABASE_PATH = ":memory:";
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });
}
