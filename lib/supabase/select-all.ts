import type { PostgrestError } from "@supabase/supabase-js";

/**
 * PostgREST caps every response at `max_rows` and returns the first rows
 * without any error, so an unpaginated select of a growing table silently
 * drops rows. Every list read in lib/data.ts goes through selectAll.
 *
 * Must not exceed `max_rows` in supabase/config.toml (and the hosted
 * project's API settings): selectAll treats a short page as the last one.
 */
export const SELECT_PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: PostgrestError | null };

/**
 * Keyset pagination: each request asks for the next `limit` rows ordered by
 * a unique key and strictly after the last key already seen, and the loop
 * ends at the first short page.
 *
 * Unlike offset paging, a row inserted or deleted mid-read cannot shift the
 * window, so rows that exist for the whole read are returned exactly once.
 * Rows inserted during the read may or may not appear, depending on where
 * their key sorts.
 *
 * `fetchPage` must order by the same unique key that `keyOf` returns, apply
 * `.gt(key, after)` when `after` is defined, and `.limit(limit)`.
 */
export async function selectAll<T, K extends string | number>(
  fetchPage: (after: K | undefined, limit: number) => PromiseLike<PageResult<T>>,
  keyOf: (row: T) => K,
  pageSize = SELECT_PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = [];
  let after: K | undefined;

  for (;;) {
    const { data, error } = await fetchPage(after, pageSize);
    if (error) throw new Error(error.message);

    const page = data ?? [];
    rows.push(...page);

    const last = page.at(-1);
    if (page.length < pageSize || last === undefined) return rows;
    after = keyOf(last);
  }
}
