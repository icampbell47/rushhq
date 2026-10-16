-- Atomically change a brother's rollbook number.
--
-- ratings.brother_rollbook_number references brothers.rollbook_number
-- without ON UPDATE CASCADE, so the app used to rename in three separate
-- requests: insert the new row, repoint ratings, delete the old row. A
-- failure or timeout between steps left two copies of the brother or
-- ratings split across both numbers. Doing all three inside one function
-- makes the change a single transaction.
--
-- ratings.submitted_by_rollbook is deliberately left alone: it records the
-- number the rating was submitted under.
CREATE FUNCTION public.rename_brother(
  p_old_rollbook_number INTEGER,
  p_new_rollbook_number INTEGER,
  p_first_name TEXT,
  p_last_name TEXT,
  -- NULL keeps the brother's existing contact details.
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

  -- Lock the source row so a concurrent rename or delete of the same
  -- brother waits for this one to finish.
  SELECT * INTO v_old
  FROM public.brothers
  WHERE rollbook_number = p_old_rollbook_number
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brother #% does not exist', p_old_rollbook_number
      USING ERRCODE = 'no_data_found';
  END IF;

  -- A taken target number fails here with unique_violation (23505).
  INSERT INTO public.brothers (rollbook_number, first_name, last_name, email, phone_number)
  VALUES (
    p_new_rollbook_number,
    p_first_name,
    p_last_name,
    COALESCE(p_email, v_old.email),
    COALESCE(p_phone_number, v_old.phone_number)
  )
  RETURNING * INTO v_new;

  UPDATE public.ratings
  SET brother_rollbook_number = p_new_rollbook_number
  WHERE brother_rollbook_number = p_old_rollbook_number;

  DELETE FROM public.brothers WHERE rollbook_number = p_old_rollbook_number;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.rename_brother(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_brother(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;
