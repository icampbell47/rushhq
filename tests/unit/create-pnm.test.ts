import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// createPnm is the one server action with no auth guard. These tests pin down
// what an anonymous caller can learn from it.

const rpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAdminSupabaseClient: () => ({
    rpc: (...args: unknown[]) => ({ abortSignal: () => rpc(...args) })
  })
}));

const { createPnm } = await import("@/app/actions/pnms");

const storedPnm = {
  id: "1d7c2f1e-7c43-4f0e-9a51-2b7d0f5f2a10",
  first_name: "Alex",
  last_name: "Rivera",
  email: "alex@example.com",
  phone_number: "404-555-0100",
  status: "Bid Ready",
  first_name_key: "alex",
  last_name_key: "rivera"
};

const checkIn = {
  first_name: "Alex",
  last_name: "Rivera",
  hometown: "",
  year_of_school: "Freshman",
  major: "Computer Science",
  instagram_handle: "",
  phone_number: ""
};

describe("createPnm (public check-in)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    rpc.mockReset();
    vi.restoreAllMocks();
  });

  it("does not return the stored PNM, even when it matches an existing record", async () => {
    rpc.mockResolvedValue({ data: storedPnm, error: null });
    const result = await createPnm(checkIn);
    expect(result).toEqual({ ok: true, data: null, message: "Check-in recorded" });
    expect(JSON.stringify(result)).not.toContain("404-555-0100");
  });

  it("omits optional arguments instead of sending null", async () => {
    rpc.mockResolvedValue({ data: storedPnm, error: null });
    await createPnm(checkIn);
    const [fn, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(fn).toBe("check_in_pnm");
    expect(args).toMatchObject({ p_first_name_key: "alex", p_last_name_key: "rivera", p_year_of_school: "Freshman" });
    expect(args.p_hometown).toBeUndefined();
    expect(args.p_phone_number).toBeUndefined();
  });

  it("replaces database errors with a generic message", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42501", message: 'permission denied for table "pnms"' } });
    const result = await createPnm(checkIn);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("permission denied");
    expect(console.error).toHaveBeenCalled();
  });

  it("replaces thrown errors (such as timeouts) with the same generic message", async () => {
    rpc.mockRejectedValue(new Error("The operation was aborted due to timeout"));
    const result = await createPnm(checkIn);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("Check-in could not be saved") });
  });

  it("still explains validation problems, which only concern the caller's own input", async () => {
    const result = await createPnm({ ...checkIn, major: "" });
    expect(result).toEqual({ ok: false, error: "Major is required" });
    expect(rpc).not.toHaveBeenCalled();
  });
});
