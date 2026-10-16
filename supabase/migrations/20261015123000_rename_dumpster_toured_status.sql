-- Rename the internal slang label for PNMs the chapter has stopped pursuing.
-- RENAME VALUE keeps the enum's sort position and updates existing rows in
-- place, so no data migration is needed.
ALTER TYPE public.pnm_status RENAME VALUE 'Dumpster Toured' TO 'Released';
