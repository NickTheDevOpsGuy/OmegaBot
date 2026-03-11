// src/services/core/database/dbTestUtils.ts
// Shared test helper: in-memory DB for unit/integration tests. Colocated with db.ts.

import { afterEach, beforeEach } from "vitest";
import { closeDatabase, initDatabase } from "./db.js";

export function useInMemoryDb(): void {
  beforeEach(() => {
    process.env.DATABASE_PATH = ":memory:";
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });
}
