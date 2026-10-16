-- Make the SQL identity normalization match lib/pnm-identity.ts exactly.
--
-- The TypeScript version decomposes accented letters (NFKD) and drops the
-- combining marks, so "José" becomes "jose". The SQL version skipped that
-- step and deleted the accented letter outright ("jos"). The app always
-- sends keys computed in TypeScript, but rows backfilled by SQL in
-- 20260820133000 got the SQL keys, so a returning PNM with an accented name
-- would not match their own earlier record and would be duplicated.
--
-- U+0300..U+036F is the Combining Diacritical Marks block, the same range
-- lib/pnm-identity.ts strips. It is written with E'' escapes so the source
-- stays ASCII instead of containing invisible combining characters.
CREATE OR REPLACE FUNCTION public.normalize_pnm_identity_part(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT regexp_replace(
    lower(regexp_replace(normalize(coalesce(input, ''), NFKD), E'[\u0300-\u036f]', '', 'g')),
    '[^a-z0-9]',
    '',
    'g'
  );
$$;

-- Re-key rows whose stored keys came from the old SQL implementation.
UPDATE public.pnms
SET
  first_name_key = public.normalize_pnm_identity_part(first_name),
  last_name_key = public.normalize_pnm_identity_part(last_name)
WHERE first_name_key IS DISTINCT FROM public.normalize_pnm_identity_part(first_name)
   OR last_name_key IS DISTINCT FROM public.normalize_pnm_identity_part(last_name);
