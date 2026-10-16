import type { PostgrestError } from "@supabase/supabase-js";

/**
 * PostgREST caps every response at `max_rows` (1000 on Supabase by default)
 * and returns the first page without any error, so an unpaginated select of
 * a growing table silently drops rows. Every list read in lib/data.ts goes
 * through this helper instead.
 */
export const SELECT_PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: PostgrestError | null; count?: number | null };

/**
 * Fetches every row by requesting consecutive ranges until the total from
 * the first response's exact count is reached. If the query does not ask for
 * a count, it stops at the first short or empty page instead, which is only
 * safe when the page size is at most the server's max_rows.
 *
 * The callback must apply a deterministic order, or rows can repeat or be
 * skipped between pages. Pages are separate requests, so rows inserted while
 * paging may or may not appear; the dashboards treat reads as snapshots.
 */
export async function selectAll<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = SELECT_PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = [];
  let total: number | null | undefined;

  for (;;) {
    const { data, error, count } = await fetchPage(rows.length, rows.length + pageSize - 1);
    if (error) throw new Error(error.message);
    if (total === undefined) total = count ?? null;

    const page = data ?? [];
    rows.push(...page);

    if (page.length === 0) return rows;
    if (total !== null ? rows.length >= total : page.length < pageSize) return rows;
  }
}
