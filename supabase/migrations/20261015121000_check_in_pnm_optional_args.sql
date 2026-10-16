-- Recreate check_in_pnm with defaults for the optional inputs.
--
-- Postgres only allows defaults on trailing parameters, so the optional ones
-- (hometown, Instagram, phone) move to the end. PostgREST calls RPCs with
-- named arguments, so callers are unaffected by the order; the practical
-- effect is that `supabase gen types` now marks those arguments optional
-- instead of typing them as required non-null strings.
--
-- The body is unchanged apart from a hardened search_path: SECURITY DEFINER
-- functions should list pg_temp last so temporary objects cannot shadow
-- tables in public.

DROP FUNCTION IF EXISTS public.check_in_pnm(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE);

CREATE FUNCTION public.check_in_pnm(
  p_first_name TEXT,
  p_last_name TEXT,
  p_year_of_school TEXT,
  p_major TEXT,
  p_first_name_key TEXT,
  p_last_name_key TEXT,
  p_rush_date DATE,
  p_hometown TEXT DEFAULT NULL,
  p_instagram_handle TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS public.pnms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pnm public.pnms;
  v_identity_lock TEXT;
BEGIN
  IF NULLIF(btrim(p_first_name_key), '') IS NULL OR NULLIF(btrim(p_last_name_key), '') IS NULL THEN
    RAISE EXCEPTION 'PNM identity keys are required';
  END IF;

  -- Serialize concurrent check-ins for the same identity so two devices
  -- submitting the same person at once cannot both take the insert branch.
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

REVOKE ALL ON FUNCTION public.check_in_pnm(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_pnm(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO service_role;
