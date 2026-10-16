import { describe, expect, it } from "vitest";
import { passwordMatches } from "@/lib/auth";
import { getSafeNextPath } from "@/lib/safe-redirect";

describe("passwordMatches", () => {
  it("matches only the exact password", () => {
    expect(passwordMatches("correct horse", "correct horse")).toBe(true);
    expect(passwordMatches("correct hors", "correct horse")).toBe(false);
    expect(passwordMatches("correct horse ", "correct horse")).toBe(false);
    expect(passwordMatches("Correct horse", "correct horse")).toBe(false);
  });

  it("never matches when the expected password is unset or empty", () => {
    expect(passwordMatches("", undefined)).toBe(false);
    expect(passwordMatches("", "")).toBe(false);
    expect(passwordMatches("anything", undefined)).toBe(false);
  });
});

describe("getSafeNextPath", () => {
  it("keeps same-origin paths, including query strings", () => {
    expect(getSafeNextPath("/pnms", "/")).toBe("/pnms");
    expect(getSafeNextPath("/pnms?rushDate=2026-09-01", "/")).toBe("/pnms?rushDate=2026-09-01");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\\/evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "pnms",
    ""
  ])("falls back for %s", (value) => {
    expect(getSafeNextPath(value, "/rate")).toBe("/rate");
  });

  it("falls back for missing or non-string form values", () => {
    expect(getSafeNextPath(null, "/rate")).toBe("/rate");
    expect(getSafeNextPath(undefined, "/rate")).toBe("/rate");
  });
});
