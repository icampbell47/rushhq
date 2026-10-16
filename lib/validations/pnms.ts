import { z } from "zod";
import { PNM_STATUSES, YEAR_OPTIONS } from "@/lib/constants";

const optionalText = z.string().trim().optional().transform((value) => value || null);
const optionalTextWithBlankDefault = z.string().trim().nullish().transform((value) => value ?? "");
const optionalPhone = z.string().trim().max(20, "Phone number must be 20 characters or fewer").optional().transform((value) => value || null);
const optionalEmail = z.string().trim().email("Enter a valid email").optional().or(z.literal("")).transform((value) => value || null);

export const checkInSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  hometown: optionalText,
  year_of_school: z.enum(YEAR_OPTIONS, { required_error: "Select a year" }),
  major: z.string().trim().min(1, "Major is required"),
  instagram_handle: optionalTextWithBlankDefault,
  phone_number: optionalPhone
});

export const pnmUpdateSchema = checkInSchema.extend({
  email: optionalEmail
});

export const pnmStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(PNM_STATUSES)
});

export type CheckInValues = z.infer<typeof checkInSchema>;
export type PnmUpdateValues = z.infer<typeof pnmUpdateSchema>;
