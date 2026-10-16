import { describe, expect, it } from "vitest";
import {
  getDefaultRushDate,
  getLatestPnmRushDate,
  getRushDateForTimestamp,
  isPnmOnRushDate,
  isRushDate
} from "@/lib/rush-day";

// All instants are written in UTC so the expectations do not depend on the
// machine running the tests (vitest.config.ts pins TZ to Asia/Tokyo).
const at = (iso: string) => new Date(iso);

it("runs in a non-Eastern time zone", () => {
  expect(new Date("2026-09-01T00:00:00Z").getTimezoneOffset()).toBe(-9 * 60);
});

describe("getDefaultRushDate (6am America/New_York cutoff)", () => {
  it("assigns 05:59 Eastern to the previous rush day", () => {
    // 2026-09-01 05:59 EDT (UTC-4)
    expect(getDefaultRushDate(at("2026-09-01T09:59:00Z"))).toBe("2026-08-31");
  });

  it("assigns 06:00 Eastern to the current rush day", () => {
    // 2026-09-01 06:00 EDT
    expect(getDefaultRushDate(at("2026-09-01T10:00:00Z"))).toBe("2026-09-01");
  });

  it("uses the Eastern date, not the UTC date, late in the evening", () => {
    // 2026-09-01 23:30 EDT is already 2026-09-02 in UTC
    expect(getDefaultRushDate(at("2026-09-02T03:30:00Z"))).toBe("2026-09-01");
  });

  it("handles the spring-forward transition (2026-03-08)", () => {
    // 01:30 EST, before clocks jump
    expect(getDefaultRushDate(at("2026-03-08T06:30:00Z"))).toBe("2026-03-07");
    // 05:59 EDT, after clocks jump
    expect(getDefaultRushDate(at("2026-03-08T09:59:00Z"))).toBe("2026-03-07");
    // 06:00 EDT
    expect(getDefaultRushDate(at("2026-03-08T10:00:00Z"))).toBe("2026-03-08");
  });

  it("handles the fall-back transition (2026-11-01)", () => {
    // 05:30 EST. If the offset were still EDT this would read as 06:30.
    expect(getDefaultRushDate(at("2026-11-01T10:30:00Z"))).toBe("2026-10-31");
    // 05:59 EST
    expect(getDefaultRushDate(at("2026-11-01T10:59:00Z"))).toBe("2026-10-31");
    // 06:00 EST
    expect(getDefaultRushDate(at("2026-11-01T11:00:00Z"))).toBe("2026-11-01");
  });

  it("rolls back across a year boundary", () => {
    // 2026-01-01 03:00 EST
    expect(getDefaultRushDate(at("2026-01-01T08:00:00Z"))).toBe("2025-12-31");
  });

  it("rolls back across a month boundary", () => {
    // 2026-03-01 02:00 EST
    expect(getDefaultRushDate(at("2026-03-01T07:00:00Z"))).toBe("2026-02-28");
  });
});

describe("getRushDateForTimestamp", () => {
  it("returns null for a missing timestamp", () => {
    expect(getRushDateForTimestamp(null)).toBeNull();
  });

  it("accepts Postgres timestamptz strings with offsets", () => {
    expect(getRushDateForTimestamp("2026-09-01T01:15:00-04:00")).toBe("2026-08-31");
    expect(getRushDateForTimestamp("2026-09-01T18:00:00+00:00")).toBe("2026-09-01");
  });
});

describe("isRushDate", () => {
  it("accepts YYYY-MM-DD strings", () => {
    expect(isRushDate("2026-09-01")).toBe(true);
  });

  it("accepts leap days only in leap years", () => {
    expect(isRushDate("2028-02-29")).toBe(true);
    expect(isRushDate("2026-02-29")).toBe(false);
  });

  it.each([null, undefined, "", "2026-9-1", "09/01/2026", "2026-09-01T00:00:00Z", "yesterday", "2026-13-01", "2026-02-30", "2026-00-10"])(
    "rejects %s",
    (value) => {
      expect(isRushDate(value)).toBe(false);
    }
  );
});

describe("isPnmOnRushDate", () => {
  it("matches when any check-in falls on the rush date", () => {
    const checkIns = [{ rush_date: "2026-08-30" }, { rush_date: "2026-09-01" }];
    expect(isPnmOnRushDate("2026-08-30T22:00:00Z", "2026-09-01", checkIns)).toBe(true);
  });

  it("falls back to created_at for PNMs that predate check-in tracking", () => {
    // 2026-09-01 19:00 EDT
    expect(isPnmOnRushDate("2026-09-01T23:00:00Z", "2026-09-01")).toBe(true);
  });

  it("applies the 6am cutoff to the created_at fallback", () => {
    // 2026-09-02 01:00 EDT belongs to the 2026-09-01 rush day
    expect(isPnmOnRushDate("2026-09-02T05:00:00Z", "2026-09-01", [])).toBe(true);
    expect(isPnmOnRushDate("2026-09-02T05:00:00Z", "2026-09-02", [])).toBe(false);
  });

  it("does not match when neither check-ins nor created_at line up", () => {
    expect(isPnmOnRushDate("2026-08-29T23:00:00Z", "2026-09-01", [{ rush_date: "2026-08-30" }])).toBe(false);
    expect(isPnmOnRushDate(null, "2026-09-01", [])).toBe(false);
  });
});

describe("getLatestPnmRushDate", () => {
  it("returns the most recent check-in date regardless of input order", () => {
    const checkIns = [{ rush_date: "2026-09-03" }, { rush_date: "2026-08-31" }, { rush_date: "2026-09-01" }];
    expect(getLatestPnmRushDate("2026-08-31T23:00:00Z", checkIns)).toBe("2026-09-03");
  });

  it("ignores malformed check-in dates", () => {
    const checkIns = [{ rush_date: null }, { rush_date: "not-a-date" }, { rush_date: "2026-09-01" }];
    expect(getLatestPnmRushDate(null, checkIns)).toBe("2026-09-01");
  });

  it("falls back to created_at when there are no check-ins", () => {
    expect(getLatestPnmRushDate("2026-09-02T05:00:00Z")).toBe("2026-09-01");
  });

  it("returns null when there is nothing to go on", () => {
    expect(getLatestPnmRushDate(null, [])).toBeNull();
  });
});
