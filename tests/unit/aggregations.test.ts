import { describe, expect, it } from "vitest";
import {
  averageScore,
  getBrotherStats,
  getNextPnmIdAlphabetical,
  groupByPnmId,
  percentage,
  summarizeRatings,
  type ScoreFields
} from "@/lib/aggregations";

const rating = (scores: Partial<ScoreFields> = {}): ScoreFields => ({
  humor_score: null,
  sociability_score: null,
  genuineness_score: null,
  passion_score: null,
  bid_vote: null,
  ...scores
});

describe("averageScore", () => {
  it("averages non-null values to one decimal place", () => {
    expect(averageScore([4, 5, null, 4])).toBe(4.3);
    expect(averageScore([1, 2])).toBe(1.5);
  });

  it("returns null when there is nothing to average", () => {
    expect(averageScore([])).toBeNull();
    expect(averageScore([null, null])).toBeNull();
  });
});

describe("percentage", () => {
  it("rounds to a whole number and is null for an empty total", () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(2, 3)).toBe(67);
    expect(percentage(0, 0)).toBeNull();
  });
});

describe("summarizeRatings", () => {
  it("summarizes a PNM with no ratings as empty rather than zero", () => {
    expect(summarizeRatings([])).toEqual({
      rating_count: 0,
      avg_humor: null,
      avg_sociability: null,
      avg_genuineness: null,
      avg_passion: null,
      bid_yes_percentage: null
    });
  });

  it("averages each category independently and counts not-sure votes in the bid denominator", () => {
    const summary = summarizeRatings([
      rating({ humor_score: 5, sociability_score: 4, bid_vote: true }),
      rating({ humor_score: 3, passion_score: 2, bid_vote: null }),
      rating({ humor_score: 4, bid_vote: false }),
      rating({ bid_vote: true })
    ]);
    expect(summary).toEqual({
      rating_count: 4,
      avg_humor: 4,
      avg_sociability: 4,
      avg_genuineness: null,
      avg_passion: 2,
      bid_yes_percentage: 50
    });
  });
});

describe("getBrotherStats", () => {
  const brothers = [
    { rollbook_number: 101, first_name: "Ethan" },
    { rollbook_number: 102, first_name: "Marcus" },
    { rollbook_number: 103, first_name: "Owen" }
  ];

  it("counts ratings and bid-yes share per brother, keeping brother fields", () => {
    const stats = getBrotherStats(brothers, [
      { brother_rollbook_number: 101, bid_vote: true },
      { brother_rollbook_number: 101, bid_vote: false },
      { brother_rollbook_number: 101, bid_vote: null },
      { brother_rollbook_number: 102, bid_vote: true },
      // Rating from a deleted brother: attributed to nobody.
      { brother_rollbook_number: null, bid_vote: true }
    ]);
    expect(stats).toEqual([
      { rollbook_number: 101, first_name: "Ethan", rating_count: 3, bid_percentage: 33 },
      { rollbook_number: 102, first_name: "Marcus", rating_count: 1, bid_percentage: 100 },
      { rollbook_number: 103, first_name: "Owen", rating_count: 0, bid_percentage: null }
    ]);
  });
});

describe("groupByPnmId", () => {
  it("groups check-ins and preserves their order", () => {
    const groups = groupByPnmId([
      { pnm_id: "a", rush_date: "2026-09-01" },
      { pnm_id: "b", rush_date: "2026-09-01" },
      { pnm_id: "a", rush_date: "2026-09-02" }
    ]);
    expect(groups.get("a")).toEqual([
      { pnm_id: "a", rush_date: "2026-09-01" },
      { pnm_id: "a", rush_date: "2026-09-02" }
    ]);
    expect(groups.get("b")).toHaveLength(1);
    expect(groups.get("c")).toBeUndefined();
  });
});

describe("getNextPnmIdAlphabetical", () => {
  // created_at values are 7pm Eastern on the given day.
  const pnms = [
    { id: "3", first_name: "carter", last_name: "Barlow", created_at: "2026-09-01T23:00:00Z" },
    { id: "1", first_name: "Aiden", last_name: "Vance", created_at: "2026-09-01T23:00:00Z" },
    { id: "4", first_name: "Carter", last_name: "Abernathy", created_at: "2026-09-02T23:00:00Z" },
    { id: "2", first_name: "Ándres", last_name: "Nash", created_at: "2026-09-02T23:00:00Z" }
  ];
  const noCheckIns = new Map<string, Array<{ rush_date: string }>>();

  it("walks first name, then last name, ignoring case and accents", () => {
    // Order: Aiden Vance (1), Ándres Nash (2), Carter Abernathy (4), carter Barlow (3)
    expect(getNextPnmIdAlphabetical(pnms, "1", undefined, noCheckIns)).toBe("2");
    expect(getNextPnmIdAlphabetical(pnms, "2", undefined, noCheckIns)).toBe("4");
    expect(getNextPnmIdAlphabetical(pnms, "4", undefined, noCheckIns)).toBe("3");
  });

  it("returns null at the end of the list or for an unknown id", () => {
    expect(getNextPnmIdAlphabetical(pnms, "3", undefined, noCheckIns)).toBeNull();
    expect(getNextPnmIdAlphabetical(pnms, "missing", undefined, noCheckIns)).toBeNull();
  });

  it("only steps through PNMs who attended the selected rush day", () => {
    expect(getNextPnmIdAlphabetical(pnms, "1", "2026-09-01", noCheckIns)).toBe("3");
    // A returning PNM joins every session they checked in to, not only the
    // day their record was created.
    const checkIns = new Map([["2", [{ rush_date: "2026-09-01" }]]]);
    expect(getNextPnmIdAlphabetical(pnms, "1", "2026-09-01", checkIns)).toBe("2");
    expect(getNextPnmIdAlphabetical(pnms, "2", "2026-09-01", checkIns)).toBe("3");
  });

  it("returns null when the current PNM is not in the selected rush day", () => {
    expect(getNextPnmIdAlphabetical(pnms, "4", "2026-09-01", noCheckIns)).toBeNull();
  });
});
