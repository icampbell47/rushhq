import { z } from "zod";

export const brotherSchema = z.object({
  rollbook_number: z.coerce.number().int().min(1, "Rollbook number is required"),
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email().or(z.literal("")).nullish().transform((value) => value || null),
  phone_number: z.string().trim().nullish().transform((value) => value || null)
});

export type BrotherValues = z.infer<typeof brotherSchema>;
