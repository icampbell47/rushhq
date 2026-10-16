import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getBrotherRows, getPnmRows, getRateData } from "@/lib/data";
import type { Database } from "@/lib/types/database";

/**
 * Regression test for PostgREST's max_rows cap (1000). Adds 1,100 ratings
 * from one temporary brother to one seeded PNM, pushing the ratings table
 * well past a single page, and checks that the data layer sees all of them.
 */
const enabled = process.env.SUPABASE_INTEGRATION === "1";
const EXTRA_RATINGS = 1100;
const BROTHER = 9_100 + Math.floor(Math.random() * 800);

describe.skipIf(!enabled)("data layer on tables larger than one PostgREST page", () => {
  const supabase = createClient<Database>(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  let pnmId = "";
  let ratingsBefore = 0;

  beforeAll(async () => {
    const { data: pnm, error: pnmError } = await supabase.from("pnms").select("id").order("id").limit(1).single();
    if (pnmError) throw new Error(pnmError.message);
    pnmId = pnm.id;

    const { count } = await supabase.from("ratings").select("id", { count: "exact", head: true }).eq("pnm_id", pnmId);
    ratingsBefore = count ?? 0;

    const { error: brotherError } = await supabase
      .from("brothers")
      .insert({ rollbook_number: BROTHER, first_name: "Load", last_name: "Test" });
    if (brotherError) throw new Error(brotherError.message);

    const rows = Array.from({ length: EXTRA_RATINGS }, (_, index) => ({
      pnm_id: pnmId,
      brother_rollbook_number: BROTHER,
      submitted_by_rollbook: String(BROTHER),
      humor_score: 3,
      sociability_score: 3,
      genuineness_score: 3,
      passion_score: 3,
      // Every fourth vote is a bid: 275 of 1,100 = 25%.
      bid_vote: index % 4 === 0
    }));
    const { error } = await supabase.from("ratings").insert(rows);
    if (error) throw new Error(error.message);
  });

  afterAll(async () => {
    await supabase.from("ratings").delete().eq("brother_rollbook_number", BROTHER);
    await supabase.from("brothers").delete().eq("rollbook_number", BROTHER);
  });

  it("the ratings table really is larger than one page", async () => {
    const { count } = await supabase.from("ratings").select("id", { count: "exact", head: true });
    expect(count).toBeGreaterThan(1000);
    // A plain select is truncated; this is the bug the data layer works around.
    const { data } = await supabase.from("ratings").select("id");
    expect(data).toHaveLength(1000);
  });

  it("getBrotherRows counts every rating", async () => {
    const rows = await getBrotherRows();
    const loadTester = rows.find((row) => row.rollbook_number === BROTHER);
    expect(loadTester).toMatchObject({ rating_count: EXTRA_RATINGS, bid_percentage: 25 });
  });

  it("getRateData returns every rating for the duplicate-rating warning", async () => {
    const { count } = await supabase.from("ratings").select("id", { count: "exact", head: true });
    const { ratings } = await getRateData();
    expect(ratings).toHaveLength(count ?? -1);
    expect(ratings.filter((rating) => rating.brother_rollbook_number === BROTHER)).toHaveLength(EXTRA_RATINGS);
  });

  it("getPnmRows counts every rating per PNM", async () => {
    const rows = await getPnmRows();
    const { count: pnmCount } = await supabase.from("pnms").select("id", { count: "exact", head: true });
    expect(rows).toHaveLength(pnmCount ?? -1);
    expect(rows.find((row) => row.id === pnmId)?.rating_count).toBe(ratingsBefore + EXTRA_RATINGS);
  });
});
