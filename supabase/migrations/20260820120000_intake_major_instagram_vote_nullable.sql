ALTER TABLE public.pnms
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS major TEXT;

ALTER TABLE public.pnms
  ADD CONSTRAINT pnms_major_not_blank
  CHECK (major IS NULL OR length(btrim(major)) > 0)
  NOT VALID;

ALTER TABLE public.pnms
  VALIDATE CONSTRAINT pnms_major_not_blank;

ALTER TABLE public.ratings
  ALTER COLUMN bid_vote DROP NOT NULL;
