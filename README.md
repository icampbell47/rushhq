# RushHQ

A full-stack recruitment platform for fraternity rush: PNMs check in at the door, brothers rate them from their phones, and recruitment admins review everything afterward to make bid decisions.

I built RushHQ for my fraternity chapter at Georgia Tech. A 99-member chapter used it during rush in place of the legacy recruitment software it had relied on before. This repository is a cleaned-up, self-contained version of that deployment (see [Project history](#project-history)).

![Next.js 14](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Supabase Postgres](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase&logoColor=white)
![Tests: Vitest + pgTAP](https://img.shields.io/badge/tests-Vitest%20%2B%20pgTAP-6e9f18)
<!-- After pushing to GitHub, add the CI badge:
![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg) -->

| Check-in kiosk | Rating form |
| --- | --- |
| ![Public check-in form](docs/screenshots/check-in.png) | ![Brother rating form with a PNM and brother selected](docs/screenshots/rate.png) |
| **PNM dashboard** | **PNM overview** |
| ![Admin PNM dashboard with summary cards and sortable table](docs/screenshots/pnm-dashboard.png) | ![PNM overview with score chart, votes, and comments](docs/screenshots/pnm-overview.png) |

<sub>Screenshots are from a local instance running the fictional seed data in `supabase/seed.sql`.</sub>

## What it does

RushHQ has three access tiers, matching the three phases of a rush event.

- **Public check-in.** A kiosk form on a shared tablet. PNMs enter their name, hometown, year, major, phone, and optionally Instagram. Repeat visitors are matched to their existing record (by normalized name and school year) instead of being duplicated, and each rush day they attend is recorded.
- **Brother ratings.** Password-protected and phone-first. A brother searches for a PNM and for himself, scores four categories from 1 to 5, votes bid / not sure / no bid, and leaves optional notes. The form remembers the brother on that device and warns if he already rated the selected PNM.
- **Admin review.** A sortable dashboard with summary counts, inline optimistic status changes, and a rush-day filter; a per-PNM page with a score chart, vote breakdown, comments, editable bio, and a "Next (A-Z)" button for stepping through one night's PNMs in a meeting; and a brother roster with participation stats.

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    Kiosk["Check-in kiosk<br/>(public)"]
    Phone["Rating form<br/>(brother)"]
    Admin["Dashboards<br/>(admin)"]
  end

  subgraph Next["Next.js 14 App Router (server)"]
    MW["middleware.ts<br/>verifies signed session"]
    RSC["Server components<br/>lib/data.ts"]
    SA["Server actions<br/>Zod validation + requireAdmin / requireBrother"]
  end

  subgraph Supabase["Supabase"]
    REST["PostgREST"]
    PG[("Postgres<br/>RLS: service_role only")]
    RPC["check_in_pnm()<br/>advisory-locked find-or-create"]
  end

  Kiosk --> SA
  Phone --> MW --> RSC
  Phone --> SA
  Admin --> MW
  RSC -- "service-role key" --> REST
  SA -- "service-role key" --> REST
  REST --> PG
  REST --> RPC --> PG
```

The browser never talks to Supabase. Every read happens in a server component and every write in a server action, both using the service-role key, which is guarded by `import "server-only"` so it cannot be bundled into client code. Row level security is enabled on every table with policies that admit only `service_role`, so the public anon key reads and writes nothing (`supabase/tests/database/rls.test.sql` checks this).

```mermaid
erDiagram
  pnms ||--o{ pnm_checkins : "attends"
  pnms ||--o{ ratings : "receives"
  brothers |o--o{ ratings : "submits"

  pnms {
    uuid id PK
    text first_name
    text last_name
    text year_of_school
    text first_name_key "normalized"
    text last_name_key "normalized"
    pnm_status status
    timestamptz created_at
  }
  pnm_checkins {
    uuid id PK
    uuid pnm_id FK
    date rush_date "unique with pnm_id"
    timestamptz checked_in_at
  }
  ratings {
    uuid id PK
    uuid pnm_id FK "cascade"
    int brother_rollbook_number FK "set null"
    text submitted_by_rollbook "historical copy"
    smallint humor_score
    smallint sociability_score
    smallint genuineness_score
    smallint passion_score
    boolean bid_vote "null = not sure"
  }
  brothers {
    int rollbook_number PK
    text first_name
    text last_name
  }
```

## Key engineering decisions

**Duplicate-proof check-in under concurrency.** Several tablets submit check-ins at once, and the same person may type their name differently on different nights. Check-in is a single Postgres function, `check_in_pnm`, that takes a transaction-scoped advisory lock on the normalized identity (year + first + last name keys), then finds or creates the PNM and inserts a check-in with `ON CONFLICT (pnm_id, rush_date) DO NOTHING`. Two submissions for the same person serialize on the lock; different people never block each other. The integration test fires 25 simultaneous spelling variants at the local API and expects one PNM and one check-in. As a sanity check, I removed the lock (and added a 50 ms sleep to widen the race window); the same test then produced 9 to 10 duplicate PNMs in each of three local runs.

**One normalization rule, implemented twice and tested against itself.** Identity keys lowercase, strip accents (NFKD), and drop everything but `[a-z0-9]`, so "Jean-Luc O'Neil" and "jean luc oneil" match. The app computes keys in TypeScript (`lib/pnm-identity.ts`), and SQL needs the same rule for backfills. The two had drifted on accented names; a migration aligned them, and the Vitest and pgTAP suites now assert the same cases.

**Atomic rollbook renumbering.** Ratings reference brothers by rollbook number, and the foreign key does not cascade updates. Changing a brother's number used to take three separate requests (insert the new row, repoint ratings, delete the old row), so a timeout in the middle left a duplicate brother or ratings split across two numbers. The `rename_brother` function does all three in one transaction, locks the source row, and fails cleanly if the target number is taken; `rename_brother.test.sql` checks that a failed rename changes nothing.

**Rush days end at 6am Eastern.** Post-rush meetings run past midnight but belong to the previous night. `lib/rush-day.ts` assigns dates in `America/New_York` with a 6am cutoff, matching the column default in SQL. The tests cover the cutoff boundary, both 2026 DST transitions, and month/year rollback, and run with the process pinned to `Asia/Tokyo` so they cannot pass by accident on an East Coast machine.

**Signed shared-password sessions instead of user accounts.** Access is by tier, not by person: brothers rate on shared tablets at events, and there is one admin group. Each tier has a shared password, compared in constant time, and a successful login sets an HS256 JWT (via `jose`, so the same code runs in Edge middleware) carrying the tier, issuer, and expiry: 30 days for brothers, 12 hours for admins. Middleware verifies it for routing, and every page and server action re-checks it with `await requireAdmin()` / `await requireBrother()`, since server actions can be called directly. A missing `await` on those checks would be a silent bypass, so ESLint's `no-floating-promises` rule is an error.

Tradeoff: there is no per-person audit trail, and rotating a password signs nobody out until their token expires (rotate `SESSION_SECRET` to revoke all sessions). Supabase Auth would solve both, but it would mean onboarding an account for every member of the chapter for a tool used mainly during rush.

**Least data to the client.** The rating page is reachable by every brother, so it receives only picker fields (no PNM phone numbers, emails, or other brothers' comments). Admin pages are the only place contact details are rendered.

**Optimistic status updates.** Admins change many statuses in a row during review. The status dropdown updates local state immediately, persists through a server action, and rolls back with an error toast on failure, instead of refetching the whole dashboard.

**Bounded server actions.** Every Supabase call from a server action has a 15-second abort signal, and actions return a typed `{ ok, data } | { ok, error }` result instead of throwing, so a stalled request on venue Wi-Fi shows a retryable error instead of an endless spinner.

**Generated types.** `lib/types/supabase.ts` is unmodified `supabase gen types` output, and CI fails if it drifts from the migrations. Regenerating it exposed a real bug: `submitted_by_rollbook` is `TEXT`, so the duplicate-rating warning had been comparing a string to a number.

## Running locally

Requirements: Node 22 (`.nvmrc`), Docker, and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm ci
npm run db:start            # starts local Supabase, applies migrations, loads seed.sql
cp .env.example .env.local  # then fill it in, see below
npm run dev                 # http://localhost:3000
```

In `.env.local`, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the `API_URL` and `SERVICE_ROLE_KEY` values from `supabase status -o env` (the API URL is `http://127.0.0.1:54321`). Pick any `BROTHER_PASSWORD` and `ADMIN_PASSWORD`, and generate `SESSION_SECRET` with `openssl rand -base64 48`.

Then open `/` for the check-in kiosk, `/rate` for the brother form, and `/pnms` or `/brothers` for the admin dashboards. The seed contains 15 brothers, 40 PNMs across the three most recent rush days, and 165 ratings, all fictional.

| Script | What it does |
| --- | --- |
| `npm run db:reset` | Rebuild the local database from migrations and seed |
| `npm run db:types` | Regenerate `lib/types/supabase.ts` from the local schema |
| `npm run db:stop` | Stop the local Supabase containers |

## Testing

| Command | Covers | Needs |
| --- | --- | --- |
| `npm test` | Vitest unit tests: identity normalization, rush-day boundaries, Zod schemas, session tokens (tampering, wrong secret, expiry, `alg: none`), redirect safety, dashboard aggregations | nothing |
| `npm run test:db` | pgTAP: `check_in_pnm` and `rename_brother` behavior and privileges, RLS for `anon` / `authenticated` / `service_role`, schema invariants | local Supabase |
| `SUPABASE_INTEGRATION=1 npm run test:integration` | Concurrency stress test against the local REST API | local Supabase |
| `npm run lint` / `npm run typecheck` | ESLint (including `no-floating-promises`) and `tsc --noEmit` | nothing |

The concurrency test is a stress test, not a proof: a pass means the race was not observed in that run. The correctness argument is the advisory lock; the test is there to catch a regression that removes it.

`.github/workflows/ci.yml` runs all of the above on every push: lint, typecheck, unit tests, and a production build without secrets in one job, and in another a fresh local Supabase stack (which replays every migration and the seed), the pgTAP suite, a generated-types drift check, and the integration tests.

## Project structure

```
app/                  routes (App Router) and server actions in app/actions/
components/           UI; components/ui/ holds the shadcn-style primitives
lib/
  auth.ts             tier checks and constant-time password comparison (server-only)
  session.ts          signed session tokens (Edge-safe)
  data.ts             server-side reads (server-only)
  aggregations.ts     pure dashboard math
  pnm-identity.ts     identity-key normalization
  rush-day.ts         6am-Eastern rush-date logic
  validations/        Zod schemas shared by forms and server actions
  types/supabase.ts   generated database types (do not edit)
supabase/
  migrations/         schema history
  seed.sql            fictional local data
  tests/database/     pgTAP suites
tests/
  unit/               Vitest
  integration/        tests that need a running Supabase
```

## Project history

The app was first built and deployed for my chapter's rush on a hosted Supabase project. This repository starts from a snapshot of that code (the first commit) and the commits after it are the hardening pass I did before publishing. Each commit message explains what changed and why. The main differences from the deployed version:

- **Authentication.** The deployed version stored the tier name itself in the cookie, so it could be forged from devtools. Sessions are now signed and expiring, and the login redirect no longer accepts `/\host` style open redirects.
- **Database access.** The original grants left the `SECURITY DEFINER` check-in function executable by the public `anon` role through Supabase's default privileges. EXECUTE is now limited to `service_role`, and a pgTAP test pins it.
- **Replayable migrations.** A migration pulled from production could not be applied to a fresh database. It now replays from scratch, with a local seed and a test suite on top.
- **Data exposure.** The rating page no longer ships PNM contact details and other brothers' comments to every brother's browser.
- **Brother management.** Renumbering a brother is a single transaction instead of three requests, and adding a brother with a number that is already taken now fails instead of overwriting the existing brother.
- **Bugs found along the way.** Editing a PNM with no email or phone failed validation, one of the duplicate-rating warning's two comparisons could never match because of a string/number mismatch, and accented names could produce duplicate PNMs. Each is fixed in its own commit, with a unit or pgTAP test where the bug was behavioral.
- **Neutral branding.** Chapter-specific names, a hotlinked crest, and internal slang (a status called "Dumpster Toured" is now "Released") were removed. Set `NEXT_PUBLIC_CHAPTER_NAME` to brand a deployment.

The rename of `001_initial.sql` to a timestamped name means a database that recorded the old version would need `supabase migration repair` before new migrations are pushed. The new migrations are additive.

## Tradeoffs and next steps

- **No login rate limiting.** The shared passwords are only as strong as their length. Proper throttling needs shared state (a table or Redis) because serverless instances do not share memory; until then, use long passwords.
- **Whole-table reads.** The dashboards fetch every PNM and rating and aggregate in TypeScript. That is simple and fast at chapter scale (hundreds of PNMs, low thousands of ratings); beyond that it should move into SQL views.
- **Not-found status code.** Because the PNM route has a `loading.tsx` boundary, Next 14 streams a 200 before `notFound()` runs, so an unknown id renders the 404 page with a 200 status.
- **No browser end-to-end tests.** Flows are covered at the unit, database, and API layers; Playwright tests for check-in and rating would be the next addition.
- **Shared credentials.** Per-person accounts would give an audit trail of who changed a status, at the cost of onboarding every brother.
