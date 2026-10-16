import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { getPnmIdentityKeys } from "@/lib/pnm-identity";
import type { Database } from "@/lib/types/database";

/**
 * Stress test for check_in_pnm under concurrent submissions.
 *
 * Fires many simultaneous RPC calls over separate HTTP requests, the way
 * several check-in tablets would, and checks that the advisory lock leaves
 * exactly one PNM per identity. A pass shows the race was not observed in
 * this run; it is evidence, not proof. The guarantee itself comes from the
 * per-identity pg_advisory_xact_lock in the function.
 */
const enabled = process.env.SUPABASE_INTEGRATION === "1";

describe.skipIf(!enabled)("check_in_pnm under concurrency", () => {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (enabled && (!url || !serviceRoleKey)) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example) to run integration tests.");
  }
  const supabase = createClient<Database>(url ?? "", serviceRoleKey ?? "", {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Unique per run so reruns and parallel CI jobs never collide. Letters only
  // so it survives identity normalization unchanged.
  const runTag = randomBytes(6).toString("hex").replace(/\d/g, (digit) => "abcdefghij"[Number(digit)]);
  const rushDate = "2031-02-14";
  const createdLastNameKeys = new Set<string>();

  function checkIn(firstName: string, lastName: string, yearOfSchool = "Freshman") {
    const keys = getPnmIdentityKeys({ first_name: firstName, last_name: lastName });
    createdLastNameKeys.add(keys.last_name_key);
    return supabase.rpc("check_in_pnm", {
      p_first_name: firstName,
      p_last_name: lastName,
      p_year_of_school: yearOfSchool,
      p_major: "Integration Testing",
      p_first_name_key: keys.first_name_key,
      p_last_name_key: keys.last_name_key,
      p_rush_date: rushDate
    });
  }

  afterAll(async () => {
    // Check-ins cascade with the PNM.
    if (createdLastNameKeys.size) {
      await supabase.from("pnms").delete().in("last_name_key", [...createdLastNameKeys]);
    }
  });

  it("collapses 25 simultaneous spelling variants of one person into one PNM and one check-in", async () => {
    const lastName = `Concurrent${runTag}`;
    const variants = Array.from({ length: 25 }, (_, index) => {
      const first = ["Jordan", "JORDAN", "jordan", " Jordan ", "Jor-dan"][index % 5];
      const last = [lastName, lastName.toUpperCase(), lastName.toLowerCase(), `${lastName}.`, ` ${lastName}`][Math.floor(index / 5)];
      return checkIn(first, last);
    });

    const results = await Promise.all(variants);
    for (const result of results) expect(result.error).toBeNull();

    const ids = new Set(results.map((result) => result.data?.id));
    expect(ids.size).toBe(1);

    const lastNameKey = getPnmIdentityKeys({ first_name: "x", last_name: lastName }).last_name_key;
    const { data: pnms, error } = await supabase.from("pnms").select("id").eq("last_name_key", lastNameKey);
    expect(error).toBeNull();
    expect(pnms).toHaveLength(1);

    const { data: checkIns } = await supabase.from("pnm_checkins").select("id").eq("pnm_id", pnms?.[0]?.id ?? "");
    expect(checkIns).toHaveLength(1);
  });

  it("creates 25 PNMs for 25 different people checking in at once", async () => {
    const lastName = `Distinct${runTag}`;
    const firstNames = Array.from({ length: 25 }, (_, index) => `Person${"abcdefghijklmnopqrstuvwxy"[index]}`);

    const results = await Promise.all(firstNames.map((firstName) => checkIn(firstName, lastName)));
    for (const result of results) expect(result.error).toBeNull();

    const lastNameKey = getPnmIdentityKeys({ first_name: "x", last_name: lastName }).last_name_key;
    const { data: pnms } = await supabase.from("pnms").select("id").eq("last_name_key", lastNameKey);
    expect(pnms).toHaveLength(25);

    const { count } = await supabase
      .from("pnm_checkins")
      .select("id", { count: "exact", head: true })
      .in("pnm_id", (pnms ?? []).map((pnm) => pnm.id));
    expect(count).toBe(25);
  });
});
