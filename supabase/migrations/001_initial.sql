CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.pnm_status AS ENUM (
  'Dumpster Toured',
  'Getting Cold',
  'Neutral',
  'Getting Hot',
  'Bidded',
  'Pledge',
  'Declined'
);

CREATE TABLE public.brothers (
  rollbook_number TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT
);

CREATE TABLE public.pnms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  hometown TEXT,
  year_of_school TEXT CHECK (year_of_school IN ('Freshman','Sophomore','Junior','Senior')),
  email TEXT,
  phone_number TEXT,
  status public.pnm_status NOT NULL DEFAULT 'Neutral',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pnm_id UUID NOT NULL REFERENCES public.pnms(id) ON DELETE CASCADE,
  brother_rollbook_number TEXT REFERENCES public.brothers(rollbook_number) ON DELETE SET NULL,
  submitted_by_rollbook TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  humor_score SMALLINT CHECK (humor_score BETWEEN 1 AND 5),
  sociability_score SMALLINT CHECK (sociability_score BETWEEN 1 AND 5),
  genuineness_score SMALLINT CHECK (genuineness_score BETWEEN 1 AND 5),
  passion_score SMALLINT CHECK (passion_score BETWEEN 1 AND 5),
  bid_vote BOOLEAN NOT NULL,
  comments TEXT,
  interests_activities TEXT
);

ALTER TABLE public.pnms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brothers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check in PNMs"
  ON public.pnms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Read PNMs with anon key"
  ON public.pnms FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage PNMs"
  ON public.pnms FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Read brothers with anon key"
  ON public.brothers FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage brothers"
  ON public.brothers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Brothers can insert ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Read ratings with anon key"
  ON public.ratings FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage ratings"
  ON public.ratings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX ratings_pnm_id_idx ON public.ratings(pnm_id);
CREATE INDEX ratings_brother_rollbook_number_idx ON public.ratings(brother_rollbook_number);
CREATE INDEX pnms_status_idx ON public.pnms(status);
CREATE INDEX pnms_created_at_idx ON public.pnms(created_at DESC);
