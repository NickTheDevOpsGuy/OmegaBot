// src/services/fun/funUsageStore.test.ts
import { describe, expect, it } from "vitest";
import { useInMemoryDb } from "../../test/dbTestUtils.js";
import { getFunUsageSnapshot, recordFunUsage } from "./funUsageStore.js";

useInMemoryDb();

describe("funUsageStore", () => {
  it("aggregates totals by command", async () => {
    await recordFunUsage({ userId: "u1", command: "dice" });
    await recordFunUsage({ userId: "u1", command: "dice" });
    await recordFunUsage({ userId: "u2", command: "coinflip" });

    const snap = await getFunUsageSnapshot();

    expect(snap.totalsByCommand.dice).toBe(2);
    expect(snap.totalsByCommand.coinflip).toBe(1);
  });

  it("aggregates totals by user", async () => {
    await recordFunUsage({ userId: "u1", command: "poll" });
    await recordFunUsage({ userId: "u1", command: "poll" });
    await recordFunUsage({ userId: "u2", command: "poll" });

    const snap = await getFunUsageSnapshot();

    expect(snap.totalsByUser.u1).toBe(2);
    expect(snap.totalsByUser.u2).toBe(1);
  });
});
