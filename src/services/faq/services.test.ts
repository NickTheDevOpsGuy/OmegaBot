// src/services/faq/services.test.ts
//
// Tests for FAQ business logic (services.ts).
//
// The services layer handles validation and transforms
// before persisting to the store.
//
// Coverage:
// - Input validation (empty keys, etc.)

import { describe, it, expect } from "vitest";
import { create } from "./services.js";

describe("FAQ service", () => {
  describe("create", () => {
    it("throws when key is empty or whitespace", () => {
      expect(() =>
        create({
          key: "   ",
          title: "Test title",
          body: "Test body",
          actor: "test-user",
        }),
      ).toThrow();
    });

    // TODO: Add more tests
    // - Valid creation
    // - Duplicate key handling
    // - Title/body validation
  });
});
