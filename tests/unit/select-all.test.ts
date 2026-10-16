import { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { selectAll } from "@/lib/supabase/select-all";

type Row = { id: number };

/**
 * Fake PostgREST table ordered by a unique id. Serves `ORDER BY id`,
 * `id > after`, and `LIMIT`, capped at `maxRows` per response. `rows` is a
 * live array so tests can insert or delete between pages.
 */
function fakeTable(rows: Row[], { maxRows = 1000 } = {}) {
  const requests: Array<{ after: number | undefined; limit: number }> = [];
  const fetchPage = async (after: number | undefined, limit: number) => {
    requests.push({ after, limit });
    const page = [...rows]
      .sort((a, b) => a.id - b.id)
      .filter((row) => after === undefined || row.id > after)
      .slice(0, Math.min(limit, maxRows));
    return { data: page, error: null };
  };
  return { fetchPage, requests };
}

const rowsUpTo = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
const ids = (rows: Row[]) => rows.map((row) => row.id);
const keyOf = (row: Row) => row.id;

describe("selectAll (keyset pagination)", () => {
  it("returns a small table in one request", async () => {
    const table = fakeTable(rowsUpTo(42));
    await expect(selectAll(table.fetchPage, keyOf)).resolves.toEqual(rowsUpTo(42));
    expect(table.requests).toEqual([{ after: undefined, limit: 1000 }]);
  });

  it("pages past the 1000-row cap using the last key of each page", async () => {
    const table = fakeTable(rowsUpTo(2500));
    const rows = await selectAll(table.fetchPage, keyOf);
    expect(ids(rows)).toEqual(ids(rowsUpTo(2500)));
    expect(table.requests.map((request) => request.after)).toEqual([undefined, 1000, 2000]);
  });

  it("stops after an empty page when the table is an exact multiple of the page size", async () => {
    const table = fakeTable(rowsUpTo(2000));
    await expect(selectAll(table.fetchPage, keyOf)).resolves.toHaveLength(2000);
    expect(table.requests.map((request) => request.after)).toEqual([undefined, 1000, 2000]);
  });

  it("returns each existing row exactly once when rows are inserted before the cursor mid-read", async () => {
    // Offset paging would re-read row 1000 here, because the insert shifts
    // every later row down by one position.
    const rows = rowsUpTo(1500).map((row) => ({ id: row.id * 10 }));
    const table = fakeTable(rows);
    const result = await selectAll(async (after, limit) => {
      const page = await table.fetchPage(after, limit);
      if (after === undefined) rows.push({ id: 5 });
      return page;
    }, keyOf);
    const seen = ids(result);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.filter((id) => id % 10 === 0)).toHaveLength(1500);
  });

  it("does not skip rows when an already-read row is deleted mid-read", async () => {
    // Offset paging would skip a row here, because the delete shifts every
    // later row up by one position.
    const rows = rowsUpTo(1500);
    const table = fakeTable(rows);
    const result = await selectAll(async (after, limit) => {
      const page = await table.fetchPage(after, limit);
      if (after === undefined) rows.splice(0, 1);
      return page;
    }, keyOf);
    expect(ids(result)).toEqual(ids(rowsUpTo(1500)));
  });

  it("works with a smaller page size as long as it fits under the server cap", async () => {
    const table = fakeTable(rowsUpTo(1200), { maxRows: 500 });
    await expect(selectAll(table.fetchPage, keyOf, 500)).resolves.toHaveLength(1200);
  });

  it("throws the PostgREST error message", async () => {
    await expect(
      selectAll(
        async () => ({ data: null, error: new PostgrestError({ message: "boom", details: "", hint: "", code: "XX000" }) }),
        keyOf
      )
    ).rejects.toThrow("boom");
  });
});
