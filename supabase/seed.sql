-- Deterministic, entirely fictional seed data for local development.
-- Names are invented, phones use the reserved 555-01xx range, and emails use
-- example.com. Rush dates are relative to "today" so the dashboard's default
-- rush-day filter always has data.

-- Rush day "today", using the same 6am America/New_York cutoff as the app.
CREATE TEMP TABLE seed_rush_days AS
WITH today AS (
  SELECT CASE
    WHEN EXTRACT(HOUR FROM (now() AT TIME ZONE 'America/New_York')) < 6
      THEN (now() AT TIME ZONE 'America/New_York')::date - 1
    ELSE (now() AT TIME ZONE 'America/New_York')::date
  END AS d
)
SELECT day_index, (SELECT d FROM today) - (2 - day_index) AS rush_date
FROM generate_series(0, 2) AS day_index;

INSERT INTO public.brothers (rollbook_number, first_name, last_name, email, phone_number)
SELECT
  100 + n,
  (ARRAY['Ethan','Marcus','Owen','Caleb','Nathan','Isaac','Julian','Levi','Adrian','Miles','Theo','Gavin','Rowan','Declan','Silas'])[n],
  (ARRAY['Hartley','Okafor','Lindqvist','Ramirez','Chen','Delacroix','Brennan','Patel','Whitfield','Nakamura','Osei','Kowalski','Sutherland','Abara','Moreau'])[n],
  'brother' || (100 + n) || '@example.com',
  '404-555-01' || lpad(n::text, 2, '0')
FROM generate_series(1, 15) AS n;

CREATE TEMP TABLE seed_pnms AS
SELECT
  n,
  md5('rushhq-seed-pnm-' || n)::uuid AS id,
  (ARRAY['Aiden','Brooks','Carter','Dominic','Elijah','Finn','Graham','Hudson','Idris','Jasper',
         'Kai','Landon','Mason','Noah','Oliver','Parker','Quinn','Reid','Sawyer','Tristan',
         'Umar','Victor','Wesley','Xavier','Yusuf','Zane','Andrés','Beckett','Colin','Dante',
         'Emmett','Felix','Grant','Hayes','Ivan','Jonah','Kieran','Lucas','Mateo','Nico'])[n] AS first_name,
  (ARRAY['Abernathy','Barlow','Castellanos','Dunmore','Ellison','Fairbanks','Gallagher','Holloway','Iverson','Jefferies',
         'Kincaid','Lockhart','Mercer','Northcott','O''Rourke','Pemberton','Quinlan','Redfield','Stratton','Thornbury',
         'Underwood','Vance','Whitaker','Yardley','Zimmerman','Ashby','Núñez','Calloway','Drummond','Easton',
         'Fitzgerald','Garrity','Harlow','Ingram','Jessup','Kensington','Larkin','Montague','Nash','Oakley'])[n] AS last_name,
  (ARRAY['Atlanta, GA','Savannah, GA','Athens, GA','Marietta, GA','Alpharetta, GA','Augusta, GA','Macon, GA','Roswell, GA',
         'Charlotte, NC','Nashville, TN','Birmingham, AL','Tampa, FL'])[1 + n % 12] AS hometown,
  (ARRAY['Freshman','Freshman','Freshman','Sophomore','Sophomore','Junior'])[1 + n % 6] AS year_of_school,
  (ARRAY['Computer Science','Mechanical Engineering','Industrial Engineering','Business Administration','Aerospace Engineering',
         'Electrical Engineering','Biomedical Engineering','Civil Engineering','Economics','Chemical Engineering'])[1 + n % 10] AS major,
  -- Per-PNM "impression" from 1 to 5 that drives scores, votes, and status.
  1 + (n * 37 + 11) % 5 AS impression,
  -- Day of first check-in: 0, 1, or 2 days ago.
  n % 3 AS first_day
FROM generate_series(1, 40) AS n;

INSERT INTO public.pnms (
  id, first_name, last_name, hometown, year_of_school, major, instagram_handle, phone_number,
  status, created_at, first_name_key, last_name_key
)
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.hometown,
  p.year_of_school,
  p.major,
  CASE WHEN p.n % 3 = 0 THEN '' ELSE '@' || lower(p.first_name) || '.' || p.n END,
  '470-555-01' || lpad(p.n::text, 2, '0'),
  (CASE
    WHEN p.impression = 5 AND p.n % 4 = 0 THEN 'Pledge'
    WHEN p.impression = 5 AND p.n % 4 = 1 THEN 'Bidded'
    WHEN p.impression = 5 THEN 'Bid Ready'
    WHEN p.impression = 4 THEN 'Getting Hot'
    WHEN p.impression = 3 THEN 'Neutral'
    WHEN p.impression = 2 AND p.n % 2 = 0 THEN 'Declined'
    WHEN p.impression = 2 THEN 'Getting Cold'
    ELSE 'Released'
  END)::public.pnm_status,
  ((d.rush_date + time '18:30' + p.n * interval '4 minutes') AT TIME ZONE 'America/New_York'),
  public.normalize_pnm_identity_part(p.first_name),
  public.normalize_pnm_identity_part(p.last_name)
FROM seed_pnms AS p
JOIN seed_rush_days AS d ON d.day_index = p.first_day;

-- Every PNM checks in on their first day; every fourth one also returns on
-- each later rush day, which exercises the multi-day check-in path.
INSERT INTO public.pnm_checkins (pnm_id, checked_in_at, rush_date)
SELECT
  p.id,
  ((d.rush_date + time '18:30' + p.n * interval '4 minutes') AT TIME ZONE 'America/New_York'),
  d.rush_date
FROM seed_pnms AS p
JOIN seed_rush_days AS d
  ON d.day_index = p.first_day
  OR (p.n % 4 = 0 AND d.day_index > p.first_day);

-- Two to six ratings per PNM, spread across the roster. Scores sit around the
-- PNM's impression with a little deterministic jitter.
INSERT INTO public.ratings (
  pnm_id, brother_rollbook_number, submitted_by_rollbook, submitted_at,
  humor_score, sociability_score, genuineness_score, passion_score,
  bid_vote, comments, interests_activities
)
SELECT
  p.id,
  r.rollbook,
  r.rollbook::text,
  ((d.rush_date + time '19:15' + (p.n + k * 7) * interval '3 minutes') AT TIME ZONE 'America/New_York'),
  greatest(1, least(5, p.impression + ((p.n + k) % 3) - 1)),
  greatest(1, least(5, p.impression + ((p.n + 2 * k) % 3) - 1)),
  greatest(1, least(5, p.impression + ((p.n * 2 + k) % 3) - 1)),
  greatest(1, least(5, p.impression + ((p.n + k * 3 + 1) % 3) - 1)),
  CASE
    WHEN p.impression >= 4 THEN (p.n + k) % 5 <> 0
    WHEN p.impression <= 2 THEN CASE WHEN (p.n + k) % 4 = 0 THEN NULL ELSE false END
    ELSE CASE (p.n + k) % 3 WHEN 0 THEN true WHEN 1 THEN false ELSE NULL END
  END,
  CASE (p.n + k) % 4
    WHEN 0 THEN (ARRAY['Great conversation about co-op plans.','Quiet at first, opened up later.','Already knows a few brothers from class.','Asked thoughtful questions about service events.','Would be a strong fit for intramurals.'])[1 + (p.n + k) % 5]
    ELSE NULL
  END,
  CASE WHEN k = 0 AND p.n % 2 = 0
    THEN (ARRAY['Club soccer','Robotics team','Guitar','Student government','Rock climbing','Hackathons'])[1 + p.n % 6]
    ELSE NULL
  END
FROM seed_pnms AS p
JOIN seed_rush_days AS d ON d.day_index = p.first_day
CROSS JOIN LATERAL generate_series(0, 1 + p.n % 5) AS k
CROSS JOIN LATERAL (SELECT 101 + (p.n * 7 + k * 4) % 15 AS rollbook) AS r;

-- A brother who has since been removed from the roster: the foreign key is
-- null but submitted_by_rollbook keeps the historical attribution, and the
-- UI shows these ratings as "Anonymous".
INSERT INTO public.ratings (
  pnm_id, brother_rollbook_number, submitted_by_rollbook, submitted_at,
  humor_score, sociability_score, genuineness_score, passion_score, bid_vote, comments
)
SELECT
  p.id,
  NULL,
  '199',
  ((d.rush_date + time '21:00') AT TIME ZONE 'America/New_York'),
  p.impression, p.impression, p.impression, p.impression,
  p.impression >= 4,
  'Submitted by a brother who is no longer on the roster.'
FROM seed_pnms AS p
JOIN seed_rush_days AS d ON d.day_index = p.first_day
WHERE p.n % 8 = 1;

DROP TABLE seed_pnms;
DROP TABLE seed_rush_days;
