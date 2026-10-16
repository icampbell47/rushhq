/**
 * Display name shown in the header, page title, and check-in screen.
 * Set NEXT_PUBLIC_CHAPTER_NAME to brand a deployment for a specific chapter.
 */
export const CHAPTER_NAME = process.env.NEXT_PUBLIC_CHAPTER_NAME?.trim() || "RushHQ";
