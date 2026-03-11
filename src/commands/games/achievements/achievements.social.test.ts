// src/commands/achievements/achievements.social.test.ts
// Social achievement checks: Quotable, Generous.

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../../services/core/database/dbTestUtils.js";
import { getDb } from "../../../services/core/database/db.js";
import { setupTables, checkQuotable, checkGenerous } from "./achievements.testHelpers.js";

useInMemoryDb();

describe("achievement system – social", () => {
  beforeEach(() => {
    setupTables();
  });

  it("Quotable - unlocks when user has a quote", () => {
    const db = getDb();
    const now = Date.now();

    expect(checkQuotable("user1")).toBe(false);

    db.prepare(
      `INSERT INTO quotes (guild_id, author_id, quote_text, added_by, added_at) VALUES (?, ?, 'Test quote', ?, ?)`,
    ).run("guild1", "user1", "user1", now);

    expect(checkQuotable("user1")).toBe(true);
  });

  it("Generous - unlocks after hosting 3 giveaways", () => {
    const db = getDb();
    const now = Date.now();

    expect(checkGenerous("user1")).toBe(false);

    const gw = (guildId: string) =>
      db
        .prepare(
          `INSERT INTO giveaways (guild_id, channel_id, host_id, prize, winner_count, ends_at, created_at) VALUES (?, 'c1', ?, 'Prize', 1, ?, ?)`,
        )
        .run(guildId, "user1", Date.now() + 3600000, now);

    gw("guild1");
    gw("guild1");
    expect(checkGenerous("user1")).toBe(false);
    gw("guild1");
    expect(checkGenerous("user1")).toBe(true);
  });
});
