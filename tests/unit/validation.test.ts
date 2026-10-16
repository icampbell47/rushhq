import { describe, expect, it } from "vitest";
import { brotherSchema } from "@/lib/validations/brothers";
import { checkInSchema, pnmStatusSchema, pnmUpdateSchema } from "@/lib/validations/pnms";
import { ratingSchema } from "@/lib/validations/ratings";

const validCheckIn = {
  first_name: "  Alex ",
  last_name: "Rivera",
  hometown: "Savannah, GA",
  year_of_school: "Freshman",
  major: "Computer Science",
  instagram_handle: "@alex",
  phone_number: "404-555-0100"
};

function errorPaths(result: { success: boolean; error?: { issues: Array<{ path: Array<string | number> }> } }) {
  return result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.path.join("."));
}

describe("checkInSchema", () => {
  it("trims text fields", () => {
    const parsed = checkInSchema.parse(validCheckIn);
    expect(parsed.first_name).toBe("Alex");
  });

  it("requires first name, last name, year, and major", () => {
    const result = checkInSchema.safeParse({ first_name: " ", last_name: "", major: "   " });
    expect(errorPaths(result).sort()).toEqual(["first_name", "last_name", "major", "year_of_school"]);
  });

  it("rejects an unknown year of school", () => {
    expect(checkInSchema.safeParse({ ...validCheckIn, year_of_school: "Graduate" }).success).toBe(false);
  });

  it("turns blank optional fields into null, and a missing Instagram into an empty string", () => {
    const parsed = checkInSchema.parse({
      ...validCheckIn,
      hometown: "   ",
      phone_number: "",
      instagram_handle: undefined
    });
    expect(parsed.hometown).toBeNull();
    expect(parsed.phone_number).toBeNull();
    expect(parsed.instagram_handle).toBe("");
  });

  it("caps phone numbers at 20 characters", () => {
    expect(checkInSchema.safeParse({ ...validCheckIn, phone_number: "1".repeat(20) }).success).toBe(true);
    expect(errorPaths(checkInSchema.safeParse({ ...validCheckIn, phone_number: "1".repeat(21) }))).toEqual(["phone_number"]);
  });
});

describe("pnmUpdateSchema", () => {
  it("accepts a blank email as null", () => {
    expect(pnmUpdateSchema.parse({ ...validCheckIn, email: "" }).email).toBeNull();
  });

  it("accepts null optional fields from an existing database row", () => {
    // Regression: the bio editor is seeded from the row, where unset columns
    // are null. These used to fail with "Expected string, received null".
    const parsed = pnmUpdateSchema.parse({ ...validCheckIn, hometown: null, phone_number: null, email: null, instagram_handle: null });
    expect(parsed).toMatchObject({ hometown: null, phone_number: null, email: null, instagram_handle: "" });
  });

  it("rejects a malformed email", () => {
    expect(errorPaths(pnmUpdateSchema.safeParse({ ...validCheckIn, email: "not-an-email" }))).toEqual(["email"]);
  });
});

describe("pnmStatusSchema", () => {
  it("requires a UUID and a known status", () => {
    expect(pnmStatusSchema.safeParse({ id: "1d7c2f1e-7c43-4f0e-9a51-2b7d0f5f2a10", status: "Neutral" }).success).toBe(true);
    expect(pnmStatusSchema.safeParse({ id: "not-a-uuid", status: "Neutral" }).success).toBe(false);
    expect(pnmStatusSchema.safeParse({ id: "1d7c2f1e-7c43-4f0e-9a51-2b7d0f5f2a10", status: "Hot" }).success).toBe(false);
  });
});

describe("ratingSchema", () => {
  const validRating = {
    pnm_id: "1d7c2f1e-7c43-4f0e-9a51-2b7d0f5f2a10",
    brother_rollbook_number: "42",
    humor_score: "5",
    sociability_score: 4,
    genuineness_score: 3,
    passion_score: 1,
    bid_vote: null,
    comments: "  ",
    interests_activities: "Intramural soccer"
  };

  it("coerces form strings to numbers and blank notes to null", () => {
    const parsed = ratingSchema.parse(validRating);
    expect(parsed.brother_rollbook_number).toBe(42);
    expect(parsed.humor_score).toBe(5);
    expect(parsed.comments).toBeNull();
    expect(parsed.bid_vote).toBeNull();
  });

  it("keeps scores between 1 and 5", () => {
    expect(ratingSchema.safeParse({ ...validRating, humor_score: 0 }).success).toBe(false);
    expect(ratingSchema.safeParse({ ...validRating, passion_score: 6 }).success).toBe(false);
    expect(ratingSchema.safeParse({ ...validRating, sociability_score: 2.5 }).success).toBe(false);
  });

  it("requires a selected PNM and brother", () => {
    const result = ratingSchema.safeParse({ ...validRating, pnm_id: "", brother_rollbook_number: 0 });
    expect(errorPaths(result)).toEqual(expect.arrayContaining(["pnm_id", "brother_rollbook_number"]));
  });

  it("accepts all three bid vote states", () => {
    for (const bid_vote of [true, false, null]) {
      expect(ratingSchema.safeParse({ ...validRating, bid_vote }).success).toBe(true);
    }
  });
});

describe("brotherSchema", () => {
  it("coerces the rollbook number and normalizes optional contact fields", () => {
    const parsed = brotherSchema.parse({ rollbook_number: "7", first_name: " Sam ", last_name: "Lee", email: "", phone_number: "" });
    expect(parsed).toEqual({ rollbook_number: 7, first_name: "Sam", last_name: "Lee", email: null, phone_number: null });
  });

  it("leaves omitted contact fields undefined so edits do not wipe them", () => {
    const parsed = brotherSchema.parse({ rollbook_number: 7, first_name: "Sam", last_name: "Lee" });
    expect(parsed.email).toBeUndefined();
    expect(parsed.phone_number).toBeUndefined();
    expect("email" in JSON.parse(JSON.stringify(parsed))).toBe(false);
  });

  it("rejects non-positive or fractional rollbook numbers", () => {
    expect(brotherSchema.safeParse({ rollbook_number: "0", first_name: "Sam", last_name: "Lee" }).success).toBe(false);
    expect(brotherSchema.safeParse({ rollbook_number: "1.5", first_name: "Sam", last_name: "Lee" }).success).toBe(false);
  });
});
