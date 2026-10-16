import { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { selectAll } from "@/lib/supabase/select-all";

/** Fake PostgREST: serves `rows` in ranges, capped at `maxRows` per response. */
function fakeTable(rows: number[], { maxRows = 1000, withCount = true } = {}) {
  const requests: Array<[number, number]> = [];
  const fetchPage = async (from: number, to: number) => {
    requests.push([from, to]);
    const end = Math.min(to + 1, from + maxRows);
    return { data: rows.slice(from, end), error: null, count: withCount ? rows.length : null };
  };
  return { fetchPage, requests };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("selectAll", () => {
  it("returns a small table in one request", async () => {
    const table = fakeTable(range(42));
    await expect(selectAll(table.fetchPage)).resolves.toEqual(range(42));
    expect(table.requests).toEqual([[0, 999]]);
  });

  it("keeps paging past the 1000-row cap until the exact count is reached", async () => {
    const table = fakeTable(range(2500));
    await expect(selectAll(table.fetchPage)).resolves.toEqual(range(2500));
    expect(table.requests).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("does not stop early when the server cap is smaller than the page size", async () => {
    const table = fakeTable(range(1200), { maxRows: 500 });
    await expect(selectAll(table.fetchPage)).resolves.toEqual(range(1200));
  });

  it("handles an exact multiple of the page size", async () => {
    const table = fakeTable(range(2000));
    await expect(selectAll(table.fetchPage)).resolves.toHaveLength(2000);
    expect(table.requests).toHaveLength(2);
  });

  it("falls back to stopping at a short page when no count is requested", async () => {
    const table = fakeTable(range(1500), { withCount: false });
    await expect(selectAll(table.fetchPage)).resolves.toEqual(range(1500));
    expect(table.requests).toEqual([[0, 999], [1000, 1999]]);
  });

  it("stops on an empty page even if the count promised more", async () => {
    let calls = 0;
    const rows = await selectAll(async () => {
      calls += 1;
      return { data: calls === 1 ? [1, 2] : [], error: null, count: 10 };
    });
    expect(rows).toEqual([1, 2]);
    expect(calls).toBe(2);
  });

  it("throws the PostgREST error message", async () => {
    await expect(
      selectAll(async () => ({
        data: null,
        error: new PostgrestError({ message: "boom", details: "", hint: "", code: "XX000" }),
        count: null
      }))
    ).rejects.toThrow("boom");
  });
});
