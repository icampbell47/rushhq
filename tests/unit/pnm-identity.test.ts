import { describe, expect, it } from "vitest";
import { getPnmIdentityKeys, normalizePnmIdentityPart } from "@/lib/pnm-identity";

describe("normalizePnmIdentityPart", () => {
  it("lowercases and strips whitespace", () => {
    expect(normalizePnmIdentityPart("  Jordan  ")).toBe("jordan");
    expect(normalizePnmIdentityPart("Mary Kate")).toBe("marykate");
  });

  it("strips punctuation so common spelling variants collapse", () => {
    expect(normalizePnmIdentityPart("O'Brien")).toBe("obrien");
    expect(normalizePnmIdentityPart("Smith-Jones")).toBe("smithjones");
    expect(normalizePnmIdentityPart("J.R.")).toBe("jr");
  });

  it("removes diacritics instead of dropping the accented letter", () => {
    expect(normalizePnmIdentityPart("José")).toBe("jose");
    expect(normalizePnmIdentityPart("Zoë")).toBe("zoe");
    expect(normalizePnmIdentityPart("Ångström")).toBe("angstrom");
  });

  it("strips already-decomposed combining marks", () => {
    // "e" + U+0301 COMBINING ACUTE ACCENT, as some keyboards produce it.
    expect(normalizePnmIdentityPart("Jose\u0301 Zoe\u0308")).toBe("josezoe");
  });

  it("keeps digits", () => {
    expect(normalizePnmIdentityPart("Henry 3rd")).toBe("henry3rd");
  });

  it("returns an empty string when nothing identifying is left", () => {
    expect(normalizePnmIdentityPart("")).toBe("");
    expect(normalizePnmIdentityPart("   ")).toBe("");
    expect(normalizePnmIdentityPart("--- !!")).toBe("");
  });
});

describe("getPnmIdentityKeys", () => {
  it("produces the same keys for case, spacing, and punctuation variants", () => {
    const a = getPnmIdentityKeys({ first_name: "Jean-Luc", last_name: "O'Neil" });
    const b = getPnmIdentityKeys({ first_name: " jean luc ", last_name: "ONEIL" });
    expect(a).toEqual({ first_name_key: "jeanluc", last_name_key: "oneil" });
    expect(b).toEqual(a);
  });
});
