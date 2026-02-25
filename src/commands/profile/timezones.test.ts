import { describe, expect, it } from "vitest";
import { filterTimezones } from "./timezones.js";

describe("filterTimezones", () => {
  it("returns up to limit when input is empty", () => {
    const result = filterTimezones("", 5);
    expect(result).toHaveLength(5);
    expect(result[0]).toBe("UTC");
  });

  it("filters by partial match", () => {
    const result = filterTimezones("America");
    expect(result.every((tz) => tz.includes("America"))).toBe(true);
  });

  it("filters by city name with underscore", () => {
    const result = filterTimezones("new york");
    expect(result).toContain("America/New_York");
  });

  it("limits results", () => {
    const result = filterTimezones("", 3);
    expect(result).toHaveLength(3);
  });
});
