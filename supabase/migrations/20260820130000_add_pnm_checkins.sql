CREATE TABLE IF NOT EXISTS public.pnm_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pnm_id UUID NOT NULL REFERENCES public.pnms(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rush_date DATE NOT NULL DEFAULT (
    CASE
      WHEN EXTRACT(HOUR FROM (now() AT TIME ZONE 'America/New_York')) < 6
        THEN ((now() AT TIME ZONE 'America/New_York')::date - 1)
      ELSE (now() AT TIME ZONE 'America/New_York')::date
    END
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS pnm_checkins_pnm_id_rush_date_key
  ON public.pnm_checkins(pnm_id, rush_date);

CREATE INDEX IF NOT EXISTS pnm_checkins_pnm_id_idx
  ON public.pnm_checkins(pnm_id);

CREATE INDEX IF NOT EXISTS pnm_checkins_rush_date_idx
  ON public.pnm_checkins(rush_date);

ALTER TABLE public.pnm_checkins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pnm_checkins'
      AND policyname = 'Anyone can insert PNM check-ins'
  ) THEN
    CREATE POLICY "Anyone can insert PNM check-ins"
      ON public.pnm_checkins FOR INSERT
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pnm_checkins'
      AND policyname = 'Read PNM check-ins with anon key'
  ) THEN
    CREATE POLICY "Read PNM check-ins with anon key"
      ON public.pnm_checkins FOR SELECT
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pnm_checkins'
      AND policyname = 'Service role can manage PNM check-ins'
  ) THEN
    CREATE POLICY "Service role can manage PNM check-ins"
      ON public.pnm_checkins FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

INSERT INTO public.pnm_checkins (pnm_id, checked_in_at, rush_date)
SELECT
  id,
  COALESCE(created_at, now()),
  CASE
    WHEN EXTRACT(HOUR FROM (COALESCE(created_at, now()) AT TIME ZONE 'America/New_York')) < 6
      THEN ((COALESCE(created_at, now()) AT TIME ZONE 'America/New_York')::date - 1)
    ELSE (COALESCE(created_at, now()) AT TIME ZONE 'America/New_York')::date
  END
FROM public.pnms
ON CONFLICT (pnm_id, rush_date) DO NOTHING;
