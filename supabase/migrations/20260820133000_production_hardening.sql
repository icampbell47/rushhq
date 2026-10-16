ALTER TABLE public.pnms
  ADD COLUMN IF NOT EXISTS first_name_key TEXT,
  ADD COLUMN IF NOT EXISTS last_name_key TEXT;

CREATE OR REPLACE FUNCTION public.normalize_pnm_identity_part(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]', '', 'g');
$$;

UPDATE public.pnms
SET
  first_name_key = COALESCE(first_name_key, public.normalize_pnm_identity_part(first_name)),
  last_name_key = COALESCE(last_name_key, public.normalize_pnm_identity_part(last_name))
WHERE first_name_key IS NULL
   OR last_name_key IS NULL;

CREATE INDEX IF NOT EXISTS pnms_identity_lookup_idx
  ON public.pnms(year_of_school, first_name_key, last_name_key);

ALTER TABLE public.ratings
  DROP CONSTRAINT IF EXISTS ratings_brother_rollbook_number_fkey;

ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_brother_rollbook_number_fkey
  FOREIGN KEY (brother_rollbook_number)
  REFERENCES public.brothers(rollbook_number)
  ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.check_in_pnm(
  p_first_name TEXT,
  p_last_name TEXT,
  p_hometown TEXT,
  p_year_of_school TEXT,
  p_major TEXT,
  p_instagram_handle TEXT,
  p_phone_number TEXT,
  p_first_name_key TEXT,
  p_last_name_key TEXT,
  p_rush_date DATE
)
RETURNS public.pnms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pnm public.pnms;
  v_identity_lock TEXT;
BEGIN
  IF NULLIF(btrim(p_first_name_key), '') IS NULL OR NULLIF(btrim(p_last_name_key), '') IS NULL THEN
    RAISE EXCEPTION 'PNM identity keys are required';
  END IF;

  v_identity_lock := coalesce(p_year_of_school, '') || ':' || p_first_name_key || ':' || p_last_name_key;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_identity_lock, 0));

  SELECT *
  INTO v_pnm
  FROM public.pnms
  WHERE year_of_school = p_year_of_school
    AND COALESCE(first_name_key, public.normalize_pnm_identity_part(first_name)) = p_first_name_key
    AND COALESCE(last_name_key, public.normalize_pnm_identity_part(last_name)) = p_last_name_key
  ORDER BY created_at NULLS LAST, id
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.pnms (
      first_name,
      last_name,
      hometown,
      year_of_school,
      major,
      instagram_handle,
      phone_number,
      first_name_key,
      last_name_key
    )
    VALUES (
      p_first_name,
      p_last_name,
      p_hometown,
      p_year_of_school,
      p_major,
      COALESCE(p_instagram_handle, ''),
      p_phone_number,
      p_first_name_key,
      p_last_name_key
    )
    RETURNING * INTO v_pnm;
  ELSE
    UPDATE public.pnms
    SET
      first_name_key = p_first_name_key,
      last_name_key = p_last_name_key,
      hometown = COALESCE(p_hometown, public.pnms.hometown),
      major = COALESCE(NULLIF(btrim(p_major), ''), public.pnms.major),
      instagram_handle = COALESCE(NULLIF(btrim(p_instagram_handle), ''), public.pnms.instagram_handle, ''),
      phone_number = COALESCE(p_phone_number, public.pnms.phone_number)
    WHERE id = v_pnm.id
    RETURNING * INTO v_pnm;
  END IF;

  INSERT INTO public.pnm_checkins (pnm_id, rush_date)
  VALUES (v_pnm.id, p_rush_date)
  ON CONFLICT (pnm_id, rush_date) DO NOTHING;

  RETURN v_pnm;
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_pnm(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_pnm(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE) TO service_role;

DROP POLICY IF EXISTS "Anyone can check in PNMs" ON public.pnms;
DROP POLICY IF EXISTS "Read PNMs with anon key" ON public.pnms;
DROP POLICY IF EXISTS "Read brothers with anon key" ON public.brothers;
DROP POLICY IF EXISTS "Brothers can insert ratings" ON public.ratings;
DROP POLICY IF EXISTS "Read ratings with anon key" ON public.ratings;
DROP POLICY IF EXISTS "Anyone can insert PNM check-ins" ON public.pnm_checkins;
DROP POLICY IF EXISTS "Read PNM check-ins with anon key" ON public.pnm_checkins;
