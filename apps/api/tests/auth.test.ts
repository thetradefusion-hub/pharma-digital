import { describe, expect, it } from "vitest";
import { sha256 } from "../src/lib/hash.js";

describe("hash utilities", () => {
  it("creates stable sha256 digests", () => {
    expect(sha256("pharma")).toBe(sha256("pharma"));
    expect(sha256("pharma")).not.toBe(sha256("other"));
  });
});
