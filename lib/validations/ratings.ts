import { z } from "zod";

export const ratingSchema = z.object({
  pnm_id: z.string().min(1, "Select a PNM before submitting").uuid("Select a valid PNM"),
  brother_rollbook_number: z.coerce.number().int().min(1, "Select a brother before submitting"),
  humor_score: z.coerce.number().int().min(1).max(5),
  sociability_score: z.coerce.number().int().min(1).max(5),
  genuineness_score: z.coerce.number().int().min(1).max(5),
  passion_score: z.coerce.number().int().min(1).max(5),
  bid_vote: z.boolean().nullable(),
  comments: z.string().trim().optional().transform((value) => value || null),
  interests_activities: z.string().trim().optional().transform((value) => value || null)
});

export type RatingValues = z.infer<typeof ratingSchema>;
