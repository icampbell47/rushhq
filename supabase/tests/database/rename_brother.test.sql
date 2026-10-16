-- pgTAP tests for rename_brother, the atomic rollbook renumbering function.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(20);

-- Fixture: two brothers, one with ratings, independent of the seed.
INSERT INTO public.brothers (rollbook_number, first_name, last_name, email, phone_number)
VALUES (801, 'Rename', 'Source', 'source@example.com', '404-555-0180'),
       (802, 'Already', 'Taken', NULL, NULL);

INSERT INTO public.ratings (pnm_id, brother_rollbook_number, submitted_by_rollbook, humor_score, bid_vote)
SELECT md5('rushhq-seed-pnm-' || n)::uuid, 801, '801', 4, true
FROM generate_series(1, 3) AS n;

-- Happy path ----------------------------------------------------------------

SELECT results_eq(
  $$ SELECT rollbook_number, first_name, last_name, email, phone_number
     FROM public.rename_brother(801, 901, 'Renamed', 'Source') $$,
  $$ VALUES (901, 'Renamed'::text, 'Source'::text, 'source@example.com'::text, '404-555-0180'::text) $$,
  'returns the renamed brother, keeping contact details that were not passed'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.brothers WHERE rollbook_number = 801 $$,
  'the old rollbook number is gone'
);

SELECT is(
  (SELECT count(*)::int FROM public.ratings WHERE brother_rollbook_number = 901),
  3,
  'ratings are repointed to the new number'
);

SELECT is(
  (SELECT count(*)::int FROM public.ratings WHERE brother_rollbook_number = 801),
  0,
  'no ratings are left on the old number'
);

SELECT is(
  (SELECT count(*)::int FROM public.ratings WHERE submitted_by_rollbook = '801'),
  3,
  'submitted_by_rollbook keeps the historical number'
);

SELECT is(
  (SELECT email FROM public.rename_brother(901, 911, 'Renamed', 'Source', p_email => 'new@example.com')),
  'new@example.com',
  'contact details that are passed replace the old ones'
);

SELECT results_eq(
  $$ SELECT email, phone_number FROM public.rename_brother(911, 912, 'Renamed', 'Source', p_email => '', p_phone_number => '') $$,
  $$ VALUES (NULL::text, NULL::text) $$,
  'an explicit blank clears contact details, matching a same-number edit'
);

SELECT results_eq(
  $$ SELECT email, phone_number FROM public.rename_brother(912, 911, 'Renamed', 'Source', p_phone_number => '404-555-0181') $$,
  $$ VALUES (NULL::text, '404-555-0181'::text) $$,
  'an omitted field keeps its (now empty) value while a passed one is set'
);

SELECT is(
  (SELECT count(*)::int FROM public.ratings WHERE brother_rollbook_number = 911),
  3,
  'ratings follow the brother through repeated renames'
);

-- Failures leave everything as it was ---------------------------------------

SELECT throws_ok(
  $$ SELECT public.rename_brother(911, 802, 'Renamed', 'Source') $$,
  '23505',
  NULL,
  'renaming onto a taken number fails with unique_violation'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.brothers WHERE rollbook_number = 911)
  AND (SELECT first_name FROM public.brothers WHERE rollbook_number = 802) = 'Already',
  'a failed rename leaves both brothers untouched'
);

SELECT is(
  (SELECT count(*)::int FROM public.ratings WHERE brother_rollbook_number = 911),
  3,
  'a failed rename leaves the ratings where they were'
);

SELECT throws_ok(
  $$ SELECT public.rename_brother(799, 798, 'No', 'One') $$,
  'P0002',
  'Brother #799 does not exist',
  'renaming a missing brother fails with no_data_found'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.brothers WHERE rollbook_number = 798 $$,
  'renaming a missing brother creates nothing'
);

SELECT throws_ok(
  $$ SELECT public.rename_brother(911, 911, 'Renamed', 'Source') $$,
  '22023',
  'New rollbook number must differ from the current one',
  'renaming to the same number is rejected'
);

SELECT throws_ok(
  $$ SELECT public.rename_brother(911, 0, 'Renamed', 'Source') $$,
  '22023',
  'Rollbook number must be a positive integer',
  'a non-positive target number is rejected'
);

-- Privileges ----------------------------------------------------------------

SELECT ok(
  NOT has_function_privilege('anon', 'public.rename_brother(integer, integer, text, text, text, text)', 'EXECUTE'),
  'anon cannot execute rename_brother'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'public.rename_brother(integer, integer, text, text, text, text)', 'EXECUTE'),
  'authenticated cannot execute rename_brother'
);

SELECT ok(
  has_function_privilege('service_role', 'public.rename_brother(integer, integer, text, text, text, text)', 'EXECUTE'),
  'service_role can execute rename_brother'
);

-- The function is SECURITY INVOKER, so it works for service_role through its
-- own table privileges rather than the function owner's.
SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$ SELECT public.rename_brother(911, 921, 'Renamed', 'Source') $$,
  'service_role can rename a brother'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
