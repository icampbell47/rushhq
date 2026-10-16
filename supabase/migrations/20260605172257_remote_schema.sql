drop extension if exists "pg_net";

alter table "public"."ratings" drop constraint "ratings_brother_rollbook_number_fkey";

alter table "public"."ratings" drop constraint "ratings_pnm_id_fkey";

drop index if exists "public"."brothers_pkey";

drop index if exists "public"."ratings_brother_rollbook_number_idx";

alter table "public"."brothers" alter column "rollbook_number" set data type integer using "rollbook_number"::integer;

alter table "public"."pnms" alter column "status" set default 'Neutral'::public.pnm_status;

alter table "public"."pnms" alter column "status" set data type public.pnm_status using "status"::text::public.pnm_status;

alter table "public"."ratings" alter column "brother_rollbook_number" set data type integer using "brother_rollbook_number"::integer;

CREATE UNIQUE INDEX brothers_pkey ON public.brothers USING btree (rollbook_number);

CREATE INDEX ratings_brother_rollbook_number_idx ON public.ratings USING btree (brother_rollbook_number);

alter table "public"."ratings" add constraint "ratings_brother_rollbook_number_fkey" FOREIGN KEY (brother_rollbook_number) REFERENCES public.brothers(rollbook_number) not valid;

alter table "public"."ratings" validate constraint "ratings_brother_rollbook_number_fkey";

alter table "public"."ratings" add constraint "ratings_pnm_id_fkey" FOREIGN KEY (pnm_id) REFERENCES public.pnms(id) ON DELETE CASCADE not valid;

alter table "public"."ratings" validate constraint "ratings_pnm_id_fkey";


