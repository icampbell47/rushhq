-- Run check_in_pnm with the caller's privileges, like rename_brother.
--
-- SECURITY DEFINER exists to let a less-privileged caller do something it
-- could not do directly. The only role allowed to execute this function is
-- service_role, which already has INSERT/UPDATE on pnms and pnm_checkins and
-- bypasses RLS, so running as the owner (postgres) added privilege without
-- any need for it. With SECURITY INVOKER, a future grant mistake can no
-- longer turn this function into a way around row level security.
ALTER FUNCTION public.check_in_pnm(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) SECURITY INVOKER;
