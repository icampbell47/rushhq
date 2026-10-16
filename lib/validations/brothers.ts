import { z } from "zod";

// Omitted contact fields stay undefined so an edit that does not send them
// leaves the stored values alone; an explicit blank clears them.
const optionalContact = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .or(z.literal(""))
    .nullish()
    .transform((value) => (value === undefined ? undefined : value || null));

export const rollbookNumberSchema = z.coerce.number().int().min(1, "Rollbook number is required");

export const brotherSchema = z.object({
  rollbook_number: rollbookNumberSchema,
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: optionalContact(z.string().trim().email()),
  phone_number: optionalContact(z.string().trim())
});

export type BrotherValues = z.infer<typeof brotherSchema>;
