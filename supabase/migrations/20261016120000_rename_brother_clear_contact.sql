-- Give rename_brother the same contact-field semantics as the app's plain
-- edit path, so changing a rollbook number never behaves differently from
-- editing a name:
--   NULL (argument omitted) -> keep the stored value
--   '' (explicit blank)     -> clear it
--   anything else           -> replace it
-- Previously NULL and '' both meant "keep", so a rename could not clear an
-- email or phone number even though a same-number edit could.
CREATE OR REPLACE FUNCTION public.rename_brother(
  p_old_rollbook_number INTEGER,
  p_new_rollbook_number INTEGER,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS public.brothers
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old public.brothers;
  v_new public.brothers;
BEGIN
  IF p_new_rollbook_number IS NULL OR p_new_rollbook_number < 1 THEN
    RAISE EXCEPTION 'Rollbook number must be a positive integer'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_old_rollbook_number = p_new_rollbook_number THEN
    RAISE EXCEPTION 'New rollbook number must differ from the current one'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_old
  FROM public.brothers
  WHERE rollbook_number = p_old_rollbook_number
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brother #% does not exist', p_old_rollbook_number
      USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO public.brothers (rollbook_number, first_name, last_name, email, phone_number)
  VALUES (
    p_new_rollbook_number,
    p_first_name,
    p_last_name,
    CASE WHEN p_email IS NULL THEN v_old.email ELSE NULLIF(btrim(p_email), '') END,
    CASE WHEN p_phone_number IS NULL THEN v_old.phone_number ELSE NULLIF(btrim(p_phone_number), '') END
  )
  RETURNING * INTO v_new;

  UPDATE public.ratings
  SET brother_rollbook_number = p_new_rollbook_number
  WHERE brother_rollbook_number = p_old_rollbook_number;

  DELETE FROM public.brothers WHERE rollbook_number = p_old_rollbook_number;

  RETURN v_new;
END;
$$;
