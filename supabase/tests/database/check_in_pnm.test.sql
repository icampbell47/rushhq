-- pgTAP tests for the check_in_pnm find-or-create function.
-- Run with `npm run test:db` (supabase test db). Each file runs in a
-- transaction that is rolled back, so the seed data is left untouched.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(24);

-- Fixture dates far from the seed's rush days.
\set day1 '''2030-01-10'''
\set day2 '''2030-01-11'''

-- Creating a new PNM ---------------------------------------------------------

SELECT lives_ok(
  $$ SELECT public.check_in_pnm('Riley', 'Quartermaine', 'Freshman', 'Physics', 'riley', 'quartermaine', '2030-01-10', p_phone_number => '404-555-0199') $$,
  'first check-in succeeds'
);

SELECT is(
  (SELECT count(*)::int FROM public.pnms WHERE first_name_key = 'riley' AND last_name_key = 'quartermaine'),
  1,
  'first check-in creates exactly one PNM'
);

SELECT is(
  (SELECT count(*)::int FROM public.pnm_checkins c JOIN public.pnms p ON p.id = c.pnm_id
   WHERE p.last_name_key = 'quartermaine' AND c.rush_date = :day1),
  1,
  'first check-in records attendance for the rush day'
);

SELECT is(
  (SELECT instagram_handle FROM public.pnms WHERE last_name_key = 'quartermaine'),
  '',
  'omitted Instagram is stored as an empty string'
);

-- Same person, same day, different spelling --------------------------------

SELECT is(
  (public.check_in_pnm('RILEY', 'Quarter-Maine', 'Freshman', 'Physics', 'riley', 'quartermaine', '2030-01-10')).id,
  (SELECT id FROM public.pnms WHERE last_name_key = 'quartermaine'),
  'a case/punctuation variant on the same day returns the existing PNM'
);

SELECT is(
  (SELECT count(*)::int FROM public.pnms WHERE last_name_key = 'quartermaine'),
  1,
  'the variant does not create a duplicate PNM'
);

SELECT is(
  (SELECT count(*)::int FROM public.pnm_checkins c JOIN public.pnms p ON p.id = c.pnm_id WHERE p.last_name_key = 'quartermaine'),
  1,
  'a repeat check-in on the same day does not add a second check-in'
);

SELECT is(
  (SELECT phone_number FROM public.pnms WHERE last_name_key = 'quartermaine'),
  '404-555-0199',
  'a repeat check-in without a phone number keeps the stored one'
);

-- Same person, next day -----------------------------------------------------

SELECT lives_ok(
  $$ SELECT public.check_in_pnm('Riley', 'Quartermaine', 'Freshman', 'Applied Physics', 'riley', 'quartermaine', '2030-01-11', p_hometown => 'Macon, GA', p_instagram_handle => '@riley.q') $$,
  'check-in on a later rush day succeeds'
);

SELECT is(
  (SELECT count(*)::int FROM public.pnms WHERE last_name_key = 'quartermaine'),
  1,
  'a later rush day still maps to the same PNM'
);

SELECT results_eq(
  $$ SELECT c.rush_date FROM public.pnm_checkins c JOIN public.pnms p ON p.id = c.pnm_id
     WHERE p.last_name_key = 'quartermaine' ORDER BY c.rush_date $$,
  $$ VALUES ('2030-01-10'::date), ('2030-01-11'::date) $$,
  'a later rush day adds a second check-in'
);

SELECT results_eq(
  $$ SELECT hometown, major, instagram_handle, phone_number FROM public.pnms WHERE last_name_key = 'quartermaine' $$,
  $$ VALUES ('Macon, GA'::text, 'Applied Physics'::text, '@riley.q'::text, '404-555-0199'::text) $$,
  'new non-empty details update the profile while omitted ones are kept'
);

-- Same name, different year -------------------------------------------------

SELECT isnt(
  (public.check_in_pnm('Riley', 'Quartermaine', 'Sophomore', 'Physics', 'riley', 'quartermaine', '2030-01-11')).id,
  (SELECT id FROM public.pnms WHERE last_name_key = 'quartermaine' AND year_of_school = 'Freshman'),
  'the same name in a different year is treated as a different person'
);

SELECT is(
  (SELECT count(*)::int FROM public.pnms WHERE last_name_key = 'quartermaine'),
  2,
  'the different-year check-in creates a second PNM'
);

-- Input guards --------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT public.check_in_pnm('!!!', 'Quartermaine', 'Freshman', 'Physics', '', 'quartermaine', '2030-01-10') $$,
  'P0001',
  'PNM identity keys are required',
  'an empty first-name key is rejected'
);

SELECT throws_ok(
  $$ SELECT public.check_in_pnm('Riley', '   ', 'Freshman', 'Physics', 'riley', '   ', '2030-01-10') $$,
  'P0001',
  'PNM identity keys are required',
  'a blank last-name key is rejected'
);

-- Privileges ----------------------------------------------------------------

SELECT ok(
  NOT has_function_privilege('anon', 'public.check_in_pnm(text, text, text, text, text, text, date, text, text, text)', 'EXECUTE'),
  'anon cannot execute check_in_pnm'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'public.check_in_pnm(text, text, text, text, text, text, date, text, text, text)', 'EXECUTE'),
  'authenticated cannot execute check_in_pnm'
);

SELECT ok(
  has_function_privilege('service_role', 'public.check_in_pnm(text, text, text, text, text, text, date, text, text, text)', 'EXECUTE'),
  'service_role can execute check_in_pnm'
);

-- Identity normalization matches lib/pnm-identity.ts ------------------------

SELECT results_eq(
  $$ SELECT public.normalize_pnm_identity_part(input)
     FROM unnest(ARRAY['  Jordan  ', 'Mary Kate', 'O''Brien', 'Smith-Jones', 'J.R.']) WITH ORDINALITY AS t(input, n) ORDER BY n $$,
  $$ VALUES ('jordan'), ('marykate'), ('obrien'), ('smithjones'), ('jr') $$,
  'normalization lowercases and strips spaces and punctuation'
);

SELECT results_eq(
  $$ SELECT public.normalize_pnm_identity_part(input)
     FROM unnest(ARRAY['José', 'Zoë', 'Ångström', 'Núñez']) WITH ORDINALITY AS t(input, n) ORDER BY n $$,
  $$ VALUES ('jose'), ('zoe'), ('angstrom'), ('nunez') $$,
  'normalization keeps the base letter of accented characters'
);

SELECT results_eq(
  $$ SELECT public.normalize_pnm_identity_part(input)
     FROM unnest(ARRAY['', '   ', '--- !!', NULL]) WITH ORDINALITY AS t(input, n) ORDER BY n $$,
  $$ VALUES (''), (''), (''), ('') $$,
  'normalization returns an empty string when nothing identifying is left'
);

-- Schema invariants the app relies on --------------------------------------

SELECT col_is_pk('public', 'brothers', 'rollbook_number', 'brothers.rollbook_number is the primary key');

SELECT has_index(
  'public', 'pnm_checkins', 'pnm_checkins_pnm_id_rush_date_key', ARRAY['pnm_id', 'rush_date'],
  'one check-in per PNM per rush day is enforced by a unique index'
);

SELECT * FROM finish();
ROLLBACK;
