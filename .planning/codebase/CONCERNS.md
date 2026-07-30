# Codebase Concerns

**Analysis Date:** 2026-07-30

## Security Considerations (read first — this is the biggest risk in the codebase)

**1. Open RLS on the anon key = the database is broadly public-writable:**
- Risk: The app never uses real Supabase Auth sessions. It runs entirely on the **Supabase anon/publishable key** (`src/integrations/supabase/client.ts`, key baked into the client bundle by design — anon keys are meant to be public). The problem is that many tables have RLS policies that grant the anon role broad read/write/delete access rather than routing sensitive access through SECURITY DEFINER RPCs. Grep confirms multiple `USING (true) WITH CHECK (true)` policies for `FOR ALL` operations, e.g.:
  - `supabase/migrations/20260728120000_trainer_profile_details.sql:28` — `FOR ALL USING (true) WITH CHECK (true)` on trainer profile/certificate tables + a public storage bucket.
  - `supabase/migrations/20260728150000_poll_tables.sql:51,55` — `poll_societies_all` / `poll_responses_all`, both `FOR ALL USING (true) WITH CHECK (true)`.
  - `supabase/migrations/20260728160000_poll_area_requests.sql:16` — same pattern.
- Files: `src/integrations/supabase/client.ts`, every `supabase/migrations/*.sql` that defines a `FOR ALL ... USING (true)` policy, and (per project memory) the **live** project `eoexvygolxoygoqfrjzc` which may have even looser policies than the committed migrations since manual SQL-editor changes aren't tracked.
- Current mitigation: None at the network layer. The only real workaround so far is columns-safe SECURITY DEFINER RPCs for a few sensitive reads (see next item), and client-side role checks that gate the *UI*, not the database.
- Impact: Anyone who opens devtools and copies the anon key + URL out of the bundle (or `public/booking-config.js`, or the embedded `/societies` static export — see below) can run arbitrary `select`/`insert`/`update`/`delete` against these tables directly via the Supabase REST API, bypassing the app UI entirely.
- Recommendations: Design a real RLS model keyed off something the DB can verify (e.g., re-adopt Supabase Auth for session identity so `auth.uid()` works, or move all sensitive access behind SECURITY DEFINER RPCs that validate a server-issued token) before this app handles more sensitive data at scale.

**2. Customer "password" is derived from date of birth (very low entropy):**
- Risk: `src/lib/phoneAuth.ts` `dobToPassword()` turns a customer's DOB into an 8-digit string (`DDMMYYYY`) and `src/contexts/AuthContext.tsx` `signInWithPhone()` (lines ~306-328) authenticates by doing a direct `supabase.from("profiles").select("id").eq("phone", normalized).eq("dob", dobString)` — i.e., login is a plain equality check against two plaintext columns in the `profiles` table, not a hashed credential.
- Files: `src/lib/phoneAuth.ts`, `src/contexts/AuthContext.tsx:306-328` (`signInWithPhone`), `:330-369` (`signUpWithPhone`, which inserts `dob` in plaintext).
- Impact: Combined with concern #1 (open RLS), an attacker doesn't even need to *guess* the DOB — they can read `profiles.phone` and `profiles.dob` directly via the anon key without going through the login form at all. Even ignoring RLS, DOB is a small, often publicly-inferable search space (~39,000 realistic values for a valid adult), making the login itself weak.
- Current mitigation: None (no hashing, no rate limiting observed in `signInWithPhone`).
- Recommendation: Treat this as a known/accepted tradeoff only if the RLS hole is closed; otherwise it compounds the exposure.

**3. Admin password is stored and checked in plaintext:**
- Risk: `src/contexts/AuthContext.tsx:379-398` (`signInAdmin`) queries `.from("admins").select("id").eq("phone", normalized).eq("password", passwordText)` — the `admins` table stores the password as plaintext and comparison happens client-side via a direct table read (no hashing, no Supabase Auth, no RPC).
- Files: `src/contexts/AuthContext.tsx:379-398`, `src/hooks/useProfile.ts:13`, `src/pages/Profile.tsx:90` (admin profile screen also reads/writes this table directly).
- Impact: Anyone who can query `admins` via the open anon key (see concern #1) can read the plaintext admin password directly, no login attempt required. There is currently only one admin account (Vishal Gupta) per project memory, so blast radius is small but total (full admin access to the whole platform).
- Current mitigation: None. This was a known, explicitly deferred decision (per project memory) because migrating the sole admin account to Firebase risks locking out the owner and needs an email + login UX change.
- Recommendation: At minimum, hash the admin password server-side (SECURITY DEFINER RPC) before this table is exposed further; consider Firebase migration once the UX risk is scoped.

**4. Trainer roster RPC likely doesn't validate the caller against the requested trainer (IDOR risk):**
- Risk: `src/pages/TrainerDashboard.tsx:129-140` calls `(supabase as any).rpc("get_trainer_clients", { _trainer_id: viewAsId || trainer!.id })`, passing the trainer ID as a plain client-supplied parameter. The migration that defines this function, `supabase/migrations/20260610100000_trainer_data_lockdown.sql`, gates the returned rows on `has_role(auth.uid(), 'admin')` / `t.user_id = auth.uid()` — but this app **never establishes a Supabase Auth session** (custom localStorage auth + Firebase for trainer credentials only), so `auth.uid()` is always `NULL` under the anon key. As written, that would make the function return zero rows for everyone, which contradicts the app actually showing rosters in production — implying the **live** function definition has been manually altered (per project memory, live schema diverges from repo migrations) to trust the passed `_trainer_id` argument directly instead.
- Files: `src/pages/TrainerDashboard.tsx:104-140`, `supabase/migrations/20260610100000_trainer_data_lockdown.sql`.
- Impact: If the live RPC trusts `_trainer_id` without checking that the caller actually is that trainer (or an admin), any trainer (or anyone with the anon key) can pass an arbitrary trainer ID and pull that trainer's full client roster (name, phone, society, time slot) — an IDOR (insecure direct object reference).
- Recommendation: Pull the live function definition via the SQL editor and confirm what it actually checks; if it trusts the parameter, tie it to something server-verifiable instead.

**5. Embedded polls micro-app ships its own Supabase keys in a committed static bundle:**
- Risk: `public/societies/` is a committed static export of a separate Next.js app ("Society Poles", source lives outside this repo) that talks to the *same* main Supabase project via `poll_*`-prefixed tables. Its `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_KEY` are baked into the compiled JS chunks under `public/societies/_next/static/chunks/*.js` and are committed to git (verified via `git ls-files public/societies/_next/static/chunks`).
- Files: `public/societies/_next/static/chunks/*.js` (18+ files tracked in git), `scripts/build-societies.sh` (rebuild/embed script).
- Impact: Same anon-key exposure as the main app, plus it means the polls key is duplicated in two separate bundles that must be kept in sync manually; a key rotation requires re-running `scripts/build-societies.sh` and re-committing `public/societies/`.
- Current mitigation: This is the intended design (anon keys are public by nature) — the actual risk is the open RLS on `poll_*` tables (see concern #1), not the key's presence itself.

**6. `leads` table RLS drift silently breaks the landing-page contact forms:**
- Risk: The committed migration `supabase/migrations/20260507175913_ff1e32e3-90ae-424d-b9d3-257bde26e4ec.sql` grants `anon, authenticated` an insert policy on `public.leads`. Per project memory, the **live** database's insert policy is stricter and **rejects** the anon key for `leads` inserts (schema drifted from the migration file). Both lead-capture forms on the landing page still insert directly into `leads`:
  - `src/pages/Landing.tsx:1991` (main contact/enquiry form)
  - `src/pages/Landing.tsx:2322` (the "consult now" popup form)
- Impact: These forms show a toast error (`Submit failed: ...` / `Could not submit: ...`) rather than silently failing, but real customer enquiries from the marketing site are likely being lost in production if the live policy is indeed stricter, since no fallback path exists (unlike `poll_area_requests`, which was created specifically to route around this same restriction on `leads`).
- Fix approach: Confirm the live `leads` INSERT policy via the SQL editor; if anon inserts are rejected, either restore the anon insert policy live, or migrate both forms to a dedicated open-RLS table the way `ActiveNeighbourhoods.tsx` (in the polls app) uses `poll_area_requests`.

## Tech Debt

**Live Supabase schema diverges from repo migrations (root cause of several other issues):**
- Issue: The live project (`eoexvygolxoygoqfrjzc`, switched from `bfqhipvgqwageefgionl` on 2026-07-02 per project memory) does not match `supabase/migrations/` 1:1. Concrete known diffs: `health_reports.client_id` (not `user_id`), `tasks` uses `description` + a `status` enum (`todo`/`in_progress`/`done`), several edge functions referenced historically (`create-trainer`, `create-customer`, `reset-customer-dob`) are not deployed and were replaced by direct table writes in the frontend, RPC `get_trainer_client_pauses` is missing (rewritten to direct queries in `TrainerPauses.tsx`), and RPCs `approve_trainer` / `reject_trainer` / `get_trainer_clients` / `get_my_society_batches` exist live but their real definitions may not match the committed `.sql` files.
- Files: entire `supabase/migrations/` directory vs. the live project (not visible in-repo); consumers include `src/components/dashboard/TrainerPauses.tsx`, `src/pages/TrainerDashboard.tsx`, `src/pages/admin/Trainers.tsx`.
- Impact: Anyone writing a new query against these tables must verify columns against the live REST API first — trusting the migration files or the generated types will produce runtime errors.
- Fix approach: Periodically pull the live schema (via `supabase db pull` or the dashboard's schema view) and reconcile it into a fresh baseline migration; until then, treat `supabase/migrations/*.sql` as a historical record, not ground truth.

**Several migrations are written but not yet applied to the live DB (manual SQL-editor step required, anon key can't run DDL):**
- `supabase/migrations/20260704120000_marketing_posts.sql` — creates `marketing_posts` + a public `marketing` storage bucket for the admin Marketing feed shown on customer/trainer dashboards. Consumed by `src/components/dashboard/MarketingFeed.tsx` and `src/pages/admin/Marketing.tsx`; degrades gracefully until run.
- `supabase/migrations/20260728120000_trainer_profile_details.sql` — adds `trainers.photo_path/intro_video_path/education/bio/specializations`, a `trainer_certificates` table, and a public `trainer-assets` bucket. Consumed by `src/components/trainer/TrainerProfileForm.tsx`, which shows an amber "Profile details aren't enabled yet — run the migration" banner until it's run.
- `supabase/migrations/20260728130000_trainer_profile_fields.sql` — adds `trainers.years_experience/clients_trained/social_link/service_areas/cv_path`, also consumed by `TrainerProfileForm.tsx` and `src/components/admin/TrainerReviewDialog.tsx`.
- `supabase/migrations/20260718120000_referrals.sql` — creates the `referrals` table for the trainer referral/earnings feature. Consumed by `src/lib/referrals.ts`, `src/pages/TrainerReferrals.tsx`, `src/pages/admin/Referrals.tsx`; pages show a "not set up" state until run.
- `supabase/migrations/20260728160000_poll_area_requests.sql` — creates `poll_area_requests` for the "Request Your Area" form in the polls app's `ActiveNeighbourhoods.tsx` (outside this repo).
- Impact: New environments / fresh clones will silently show degraded ("not enabled yet") UI for these features until a human runs each `.sql` file in the Supabase SQL editor. There's no migration-runner or CI check that verifies live schema matches the repo.

**Generated Supabase types lag behind the live/pending schema, forcing widespread `supabase as any` casts:**
- Confirmed 47 occurrences of the literal string `supabase as any` across 13 files (`grep -rn "supabase as any" src | wc -l`):
  - `src/stores/pauseStore.tsx`
  - `src/components/trainer/TrainerProfileForm.tsx`
  - `src/components/admin/customer-tabs/PlanTab.tsx`
  - `src/components/admin/TrainerReviewDialog.tsx`
  - `src/components/dashboard/SocietyBatches.tsx`
  - `src/components/admin/customer-tabs/ProfileTab.tsx`
  - `src/pages/TrainerReferrals.tsx`
  - `src/pages/Dashboard.tsx`
  - `src/pages/TrainerDashboard.tsx`
  - `src/pages/Plan.tsx`
  - `src/pages/admin/Referrals.tsx`
  - `src/pages/admin/Dashboard.tsx`
  - `src/pages/admin/Trainers.tsx`
- Impact: Every one of these casts disables TypeScript's column/table-name checking for that query, so typos in column names or table names only surface at runtime (often silently, if `.maybeSingle()`/optional chaining swallows the error). This is a direct symptom of the live-schema-vs-migrations drift above, not a one-off shortcut.
- Fix approach: Regenerate `src/integrations/supabase/types.ts` (currently 943 lines, `src/integrations/supabase/types.ts`) from the live project once the pending migrations are applied, then remove the `as any` casts file by file.

**Dual, unsynced auth systems with no reconciliation layer:**
- Customers + admins: custom localStorage auth (`fitved_custom_user` / `fitved_custom_role` keys), no session expiry mechanism visible beyond manual sign-out, implemented entirely in `src/contexts/AuthContext.tsx`.
- Trainers: Firebase Auth (`src/integrations/firebase/client.ts`) for credentials (email/password + Google), matched to the `trainers` Supabase row by email (`ilike`).
- Files: `src/contexts/AuthContext.tsx` (489 lines, owns both flows), `src/integrations/firebase/client.ts`.
- Impact: Deleting a user in the Firebase console does not touch the matching Supabase `trainers` row (documented explicitly in `scripts/README.md`); the reverse (deleting a `trainers` row via the admin panel) does cascade-clean Supabase tables but leaves an orphaned-but-harmless Firebase credential. There is no automated reconciliation; a Firebase Cloud Function for console-delete cleanup is scoped but not implemented (requires the paid Blaze plan — snippet exists in `scripts/README.md` but is not wired up).
- Fix approach: If Firebase console deletion becomes a common workflow, enable Blaze and wire the documented Cloud Function; otherwise standardize on "always delete via Admin → Trainers" and treat direct Firebase-console deletion as unsupported.

**`admins.password` plaintext-storage migration is incomplete/one-off:**
- Trainers had their plaintext passwords cleared from `trainers.password` via a one-click onboarding flow (`onboardFirebase` mutation in `src/pages/admin/Trainers.tsx`, run 2026-07-17 per project memory — verified all 5 trainers migrated). No equivalent flow exists for the single `admins` row; see Security Considerations #3.

**Static-export tradeoff for the embedded polls app:**
- Issue: `public/societies/` is a Next.js static export (`output: "export"`) whose `society/[slug]` pages are prerendered at build time from `generateStaticParams` (source lives outside this repo, in the separate "Society Poles" project). A society added by an admin *after* the last static build has no page and 404s until `scripts/build-societies.sh` is manually re-run and `public/societies/` recommitted.
- Files: `scripts/build-societies.sh` (rebuild/embed script, lives in this repo), `public/societies/` (committed static output).
- Impact: Admin-added societies are invisible on the public site for an unbounded period (until someone remembers to rebuild), with no CI/cron automation to close the gap.
- Fix approach: Either move the polls `society/[slug]` route to a dynamic/ISR rendering mode (requires a Node runtime rather than static export, so it'd have to leave `public/societies/` and become its own deployment), or add a scheduled job that re-runs `scripts/build-societies.sh` whenever `poll_societies` changes.

**Duplicated "neighborhoods" content across two surfaces:**
- The "Our Active Neighbourhoods" section exists both as `ActiveNeighbourhoods.tsx` in the polls app (rendered on the societies home page, outside this repo) and as static content on `public/service-areas.html` in this repo. Per project memory, the second copy was never removed after the first was added.
- Impact: Content updates (adding a serviced locality, etc.) must be made in two unrelated places or they'll drift.

## Known Bugs

**Landing-page lead forms may be failing silently in production:**
- Symptoms: Both contact/enquiry forms (`src/pages/Landing.tsx:1991` and `:2322`) insert into `public.leads`; if the live RLS policy rejects anon inserts (per project memory, stricter than the committed migration), users see a "Submit failed" toast but the enquiry is lost — there is no local queue, retry, or admin-visible failure log.
- Files: `src/pages/Landing.tsx:1976-2010` (main form), `src/pages/Landing.tsx:2296-2340` (popup form).
- Trigger: Submit either form on the live site while the `leads` INSERT policy for `anon` is missing/stricter than `supabase/migrations/20260507175913_ff1e32e3-90ae-424d-b9d3-257bde26e4ec.sql`.
- Workaround: None currently implemented; `poll_area_requests` (a separate, dedicated open-RLS table) was created specifically to route around this same restriction for the "Request Your Area" form, but the main `leads` table forms were not migrated to the same pattern.

**Trainer roster RPC (`get_trainer_clients`) may not actually authorize the caller (see Security Considerations #4):**
- Symptoms: Under the committed migration's definition, the function should return zero rows for every caller (since `auth.uid()` is always NULL without a Supabase Auth session) — yet trainers do see their rosters in production, meaning the live function differs from the repo's migration in an unverified way.
- Files: `src/pages/TrainerDashboard.tsx:129-140`, `supabase/migrations/20260610100000_trainer_data_lockdown.sql`.
- Trigger: Call the RPC with an arbitrary `_trainer_id` (e.g., via the browser console using the app's own `supabase` client, or directly against the REST API with the anon key) and see whether it returns data for a trainer other than the caller.

## Fragile Areas

**`recalculatePlanDates` (plan/pause date reconciliation):**
- Files: `src/stores/pauseStore.tsx:27-90ish` (`recalculatePlanDates`), `src/lib/sessionPlan.ts` (date math helpers it depends on: `calculatePlanEndDate`, `calculatePlanRenewalDate`, `extendEndDateBySessions`, `countLostTrainingDays`, `isoDate`).
- Why fragile: Recomputes end/renewal dates for **every** plan a customer has (not just the latest), bounding each plan's pause/off-day lookups to its own `[start_date, baseEnd]` window so retroactive/backdated changes reconcile correctly. This is inherently order- and boundary-sensitive date arithmetic (month-length assumptions in `incomeAllocation.ts`'s sibling logic, local-timezone date string construction repeated ad hoc in multiple functions rather than a single shared date utility). A duplicate-plan-rows incident was found and manually cleaned up once (per project memory: two identical-start-date plans for one customer, stale copy deleted).
- Safe modification: Any change to plan/pause schemas or to how "lost training days" are counted must re-verify against all of a customer's plans, not just the newest one; consider adding a regression fixture covering multi-plan, backdated-pause scenarios before touching this function.
- Test coverage: No automated tests exist for this logic (see Test Coverage Gaps below); prior verification was a manual one-off "36 plans, 0 diffs" audit, not a repeatable test.

**Auth/session flows split across `src/contexts/AuthContext.tsx` (489 lines) with no session-storage abstraction:**
- Why fragile: All three roles (client, trainer, admin) branch through the same file with different backing stores (localStorage keys, Firebase, direct Supabase table reads) and different verification semantics (`trainers.active` overloaded to mean both "pending" and "verified", per project memory — a genuinely revoked trainer looks identical to a pending one in the UI, since revoke is implemented as delete rather than a distinct status).
- Files: `src/contexts/AuthContext.tsx`.
- Safe modification: Search for all three localStorage keys (`fitved_custom_user`, `fitved_custom_role`, `fitved_pending_signup`) before changing sign-in/sign-out flows; a stray `supabase.auth` listener previously caused magic-link URLs to silently auto-login users with no profile (fixed by setting `detectSessionInUrl: false` in `src/integrations/supabase/client.ts` and removing the listener) — do not reintroduce a Supabase Auth session listener without re-auditing this interaction.

**Large, monolithic page components:**
- `src/pages/Landing.tsx` — 2,671 lines (marketing site: nav, hero, all sections, two lead forms, FAQ accordion).
- `src/pages/TrainerDashboard.tsx` — 1,748 lines (roster, calendars, referrals banner, pending-verification banner, phone/password collection dialogs, all in one component).
- `src/pages/admin/Trainers.tsx` — 1,394 lines (trainer CRUD, pending-verification review, Firebase onboarding banner, off-time management).
- Why fragile: Each file mixes data-fetching, multiple unrelated UI concerns, and business logic in a single component, making isolated changes risky (easy to break an unrelated section while editing one part of the file) and code review harder.
- Safe modification: When touching these files, prefer extracting the specific section being changed into its own component first (there is precedent: `src/components/admin/TrainerReviewDialog.tsx` and `src/components/trainer/TrainerProfileForm.tsx` were already split out this way).

## Performance Bottlenecks

**Client-side roster/batch aggregation instead of DB-side grouping:**
- Files: `src/pages/TrainerDashboard.tsx:142-156` (`batchMap` — groups all of a trainer's clients by society/time-slot in a `useMemo` over the full roster fetched via `get_trainer_clients`).
- Problem: For trainers with large rosters this refetches and re-groups the entire client list on every roster invalidation rather than letting the DB aggregate; not currently a measured bottleneck (no roster is large yet) but will not scale past a few hundred clients per trainer without becoming visibly slow on re-renders.

## Test Coverage Gaps

**No real test suite exists:**
- `src/test/example.test.ts` is the only test file in the repo and is a placeholder (`expect(true).toBe(true)`).
- `vitest.config.ts` and `package.json` (`"test": "vitest run"`, `"test:watch": "vitest"`) are correctly wired up, so the tooling is ready — it's simply unused.
- What's not tested: All authentication flows (customer phone+DOB, trainer Firebase, admin plaintext password), all date/plan reconciliation logic (`src/lib/sessionPlan.ts`, `src/stores/pauseStore.tsx`, `src/lib/incomeAllocation.ts`), referral earnings math (`src/lib/referrals.ts` — per project memory this was manually verified once via a standalone ad hoc script, not a committed test), and every Supabase query built with `as any` casts (no compile-time or runtime check that columns exist).
- Risk: Silent regressions in billing/income allocation or plan-date math would not be caught before reaching production; the `as any` casts mean even TypeScript can't catch column-name typos.
- Priority: High for `src/lib/incomeAllocation.ts`, `src/lib/sessionPlan.ts`, and `src/stores/pauseStore.tsx` (financial/date correctness); Medium for auth flows; Low for UI components.

## Dependencies at Risk

**`scripts/migrate-trainers-to-firebase.mjs` requires a manually-downloaded, gitignored service-account key:**
- Risk: The script needs `scripts/firebase-service-account.json` (correctly gitignored per `.gitignore`) and the `firebase-admin` dev dependency, which is not in `package.json`'s committed dependency list (installed ad hoc via `npm i -D firebase-admin` per `scripts/README.md`). This makes the script non-reproducible from a fresh clone without manual credential provisioning, and it's already largely superseded by the in-app `onboardFirebase` one-click flow in `src/pages/admin/Trainers.tsx` (per project memory, run once on 2026-07-17, migrating the last 5 trainers) but is kept in the repo as a fallback.
- Files: `scripts/migrate-trainers-to-firebase.mjs`, `scripts/README.md`.

---

*Concerns audit: 2026-07-30*
