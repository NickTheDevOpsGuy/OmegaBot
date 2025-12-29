import { describe, it, expect } from "vitest";
import { create } from "./services.js";

describe("FAQ service", () => {
  it("throws when key is empty", () => {
    expect(() =>
      create({
        key: "   ",
        title: "Test title",
        body: "Test body",
        actor: "test-user",
      }),
    ).toThrow();
  });
});
