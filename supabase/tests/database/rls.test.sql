-- Row level security: the browser-facing roles get nothing.
--
-- The app reads and writes exclusively through the service-role key on the
-- server, so every table keeps RLS enabled with policies that only admit
-- service_role. These tests run against the seeded database, so "0 rows"
-- means rows exist but are filtered, not that the tables are empty.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(22);

SELECT ok(
  (SELECT bool_and(relrowsecurity) FROM pg_class
   WHERE oid IN ('public.pnms'::regclass, 'public.brothers'::regclass, 'public.ratings'::regclass, 'public.pnm_checkins'::regclass)),
  'RLS is enabled on every application table'
);

SELECT cmp_ok((SELECT count(*) FROM public.pnms), '>', 0::bigint, 'seed data is present for the checks below');

-- anon -----------------------------------------------------------------------
SET LOCAL ROLE anon;

SELECT is((SELECT count(*) FROM public.pnms), 0::bigint, 'anon sees no PNMs');
SELECT is((SELECT count(*) FROM public.brothers), 0::bigint, 'anon sees no brothers');
SELECT is((SELECT count(*) FROM public.ratings), 0::bigint, 'anon sees no ratings');
SELECT is((SELECT count(*) FROM public.pnm_checkins), 0::bigint, 'anon sees no check-ins');

SELECT throws_ok(
  $$ INSERT INTO public.pnms (first_name, last_name) VALUES ('Anon', 'Insert') $$,
  '42501', NULL, 'anon cannot insert PNMs'
);
SELECT throws_ok(
  $$ INSERT INTO public.brothers (rollbook_number, first_name, last_name) VALUES (9001, 'Anon', 'Insert') $$,
  '42501', NULL, 'anon cannot insert brothers'
);
SELECT throws_ok(
  $$ INSERT INTO public.ratings (pnm_id, bid_vote) SELECT md5('rushhq-seed-pnm-1')::uuid, true $$,
  '42501', NULL, 'anon cannot insert ratings'
);
SELECT throws_ok(
  $$ INSERT INTO public.pnm_checkins (pnm_id) SELECT md5('rushhq-seed-pnm-1')::uuid $$,
  '42501', NULL, 'anon cannot insert check-ins'
);

-- Updates and deletes see no rows, so they silently affect nothing.
SELECT is_empty(
  $$ UPDATE public.pnms SET status = 'Bidded' RETURNING id $$,
  'anon updates match no PNMs'
);

RESET ROLE;

-- authenticated --------------------------------------------------------------
SET LOCAL ROLE authenticated;

SELECT is((SELECT count(*) FROM public.pnms), 0::bigint, 'authenticated sees no PNMs');
SELECT is((SELECT count(*) FROM public.brothers), 0::bigint, 'authenticated sees no brothers');
SELECT is((SELECT count(*) FROM public.ratings), 0::bigint, 'authenticated sees no ratings');
SELECT is((SELECT count(*) FROM public.pnm_checkins), 0::bigint, 'authenticated sees no check-ins');

SELECT throws_ok(
  $$ INSERT INTO public.pnms (first_name, last_name) VALUES ('Auth', 'Insert') $$,
  '42501', NULL, 'authenticated cannot insert PNMs'
);
SELECT throws_ok(
  $$ INSERT INTO public.ratings (pnm_id, bid_vote) SELECT md5('rushhq-seed-pnm-1')::uuid, true $$,
  '42501', NULL, 'authenticated cannot insert ratings'
);
SELECT is_empty(
  $$ DELETE FROM public.brothers RETURNING rollbook_number $$,
  'authenticated deletes match no brothers'
);

RESET ROLE;

-- service_role ---------------------------------------------------------------
SET LOCAL ROLE service_role;

SELECT cmp_ok((SELECT count(*) FROM public.pnms), '>', 0::bigint, 'service_role sees PNMs');
SELECT cmp_ok((SELECT count(*) FROM public.ratings), '>', 0::bigint, 'service_role sees ratings');
SELECT lives_ok(
  $$ INSERT INTO public.brothers (rollbook_number, first_name, last_name) VALUES (9001, 'Service', 'Role') $$,
  'service_role can insert brothers'
);

RESET ROLE;

SELECT is(
  (SELECT count(*) FROM public.pnms WHERE status = 'Bidded'),
  (SELECT count(*) FROM public.pnms p WHERE p.status = 'Bidded' AND p.id IS NOT NULL),
  'the anon update above changed nothing'
);

SELECT * FROM finish();
ROLLBACK;
