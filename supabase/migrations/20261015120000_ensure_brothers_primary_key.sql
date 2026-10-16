-- brothers.rollbook_number must be the primary key: ratings reference it and
-- the app upserts on it. A fresh replay of the earlier migrations keeps the
-- constraint, but a database that applied the original generated
-- remote_schema diff may only have a unique index named brothers_pkey.
-- Promote that index (or create the key) only when the constraint is missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.brothers'::regclass
      AND contype = 'p'
  ) THEN
    IF to_regclass('public.brothers_pkey') IS NOT NULL THEN
      ALTER TABLE public.brothers ADD CONSTRAINT brothers_pkey PRIMARY KEY USING INDEX brothers_pkey;
    ELSE
      ALTER TABLE public.brothers ADD CONSTRAINT brothers_pkey PRIMARY KEY (rollbook_number);
    END IF;
  END IF;
END
$$;
