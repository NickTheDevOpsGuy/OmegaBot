// src/services/fun/funUsageStore.test.ts
//
// Tests for fun command usage tracking.
//
// The usage store records every invocation of /fun commands,
// enabling leaderboards and analytics.
//
// Coverage:
// - Aggregation by command
// - Aggregation by user

import { describe, expect, it } from "vitest";
import { useInMemoryDb } from "../../core/database/dbTestUtils.js";
import { getFunUsageSnapshot, recordFunUsage } from "./funUsageStore.js";

useInMemoryDb();

describe("funUsageStore", () => {
  it("aggregates totals by command", async () => {
    // Record multiple uses of different commands
    await recordFunUsage({ userId: "u1", command: "dice" });
    await recordFunUsage({ userId: "u1", command: "dice" });
    await recordFunUsage({ userId: "u2", command: "coinflip" });

    const snap = await getFunUsageSnapshot();

    // Verify command totals
    expect(snap.totalsByCommand.dice).toBe(2);
    expect(snap.totalsByCommand.coinflip).toBe(1);
  });

  it("aggregates totals by user", async () => {
    // Record uses across multiple users
    await recordFunUsage({ userId: "u1", command: "poll" });
    await recordFunUsage({ userId: "u1", command: "poll" });
    await recordFunUsage({ userId: "u2", command: "poll" });

    const snap = await getFunUsageSnapshot();

    // Verify user totals
    expect(snap.totalsByUser.u1).toBe(2);
    expect(snap.totalsByUser.u2).toBe(1);
  });
});
