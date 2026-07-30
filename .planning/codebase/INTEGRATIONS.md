# External Integrations

**Analysis Date:** 2026-07-30

## APIs & External Services

**Database / Backend-as-a-Service:**
- Supabase (project ref `eoexvygolxoygoqfrjzc`) - primary and only application database, storage, and (for the embedded polls sub-app) realtime channels
  - SDK/Client: `@supabase/supabase-js` 2.105.1, instantiated in `src/integrations/supabase/client.ts`
  - Auth env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (in `.env`, gitignored, also set on Vercel)
  - **Important:** the repo's `supabase/migrations/*.sql` (31 files) do NOT fully match the live schema — the live project was switched from an earlier project (`bfqhipvgqwageefgionl`) on 2026-07-02 via `supabase/migrations/20260702120000_fix_live_db_linkage.sql`, and several newer migrations are written but **not yet run** against the live DB as of this analysis: `20260704120000_marketing_posts.sql`, `20260728120000_trainer_profile_details.sql`, `20260728130000_trainer_profile_fields.sql`, `20260718120000_referrals.sql`, `20260728160000_poll_area_requests.sql`. UI code degrades gracefully (shows "not enabled yet" banners) until each is applied. Always verify columns against the live REST API, not just the migration files, before writing new queries.
  - No Supabase Edge Functions are deployed live — functions like create-trainer/create-customer/reset-customer-dob were replaced with direct table writes from the frontend

- Firebase (Auth only) - `firebase` 12.16.0, `src/integrations/firebase/client.ts`
  - Used **exclusively for trainer authentication**: email/password, Google OAuth (`GoogleAuthProvider`), and passwordless email-link sign-in
  - Also used for customer **email verification** during signup (`sendSignInLinkToEmail`/`signInWithEmailLink` in `src/contexts/AuthContext.tsx`) — this confirms an email address but the actual account/session created is the app's own custom localStorage session, not a Firebase or Supabase session
  - Env vars: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID` (public by design — Firebase web config is not a secret; access is gated by Firebase console rules)
  - Customers and admins are NEVER in Firebase — only trainers have Firebase credentials
  - Admin-side one-off migration tooling: `scripts/migrate-trainers-to-firebase.mjs` (Firebase Admin SDK, requires a gitignored `scripts/firebase-service-account.json` service-account key — not committed, must be supplied locally by whoever runs it)

**Analytics:**
- Google Tag Manager / Google Analytics (`gtag.js`) - loaded in `index.html` (`<script async src="https://www.googletagmanager.com/gtag/js?id=G-WE15154PM9">`), measurement ID `G-WE15154PM9`
  - Custom event tracking wrapper `trackEvent()` in `src/pages/Landing.tsx` (calls `window.gtag("event", name, params)` when available) — fires on interactions like `whatsapp_clicked`

**Messaging (link-based, no API):**
- WhatsApp - NOT an API integration; the app generates `wa.me/<number>` deep links (e.g. `src/pages/Landing.tsx`, `src/pages/admin/Dashboard.tsx`, `src/pages/TrainerDashboard.tsx`, `src/pages/Corporate.tsx`, `src/pages/FaqsPage.tsx`) that open WhatsApp Web/app with a prefilled message. No WhatsApp Business API, webhook, or SDK is used. Contact number used across links: `9606047293`.

**Payments:**
- Razorpay - displayed only as a trust badge/logo (`razorpayRizeLogo`, `src/assets/razorpay-rize.svg`) on `Login.tsx`, `Corporate.tsx`, `Landing.tsx`. **No Razorpay SDK, API keys, or checkout integration exists in the codebase.** Payment collection/billing appears to be handled manually/offline; the app only records the resulting `billing_history` rows in Supabase.

## Data Storage

**Databases:**
- PostgreSQL via Supabase (project `eoexvygolxoygoqfrjzc`)
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)
  - Client: `@supabase/supabase-js`, typed via generated `src/integrations/supabase/types.ts` (`Database` type) — note this generated types file may itself be stale relative to the live schema for the same reason migrations are stale
  - Known tables in active use (from code + migrations): `profiles`, `trainers`, `trainer_societies`, `trainer_slots`, `trainer_off_times`, `comp_classes`, `trainer_session_adjustments`, `user_roles`, `billing_history`, `plans`/plan-related tables, `health_reports`, `tasks`, `leads`, `referrals`, `marketing_posts`, `daily_tips`, `societies` (trainer-assignment societies, distinct from the polls app's `poll_societies`)
  - Polls sub-app tables (same project, `poll_` prefix): `poll_societies`, `poll_slots`, `poll_responses`, `poll_area_requests`

**File Storage:**
- Supabase Storage buckets (same project):
  - `health-reports` - customer health report uploads (`src/components/admin/customer-tabs/HealthTab.tsx`, `src/components/admin/customer-tabs/ProfileTab.tsx`, `src/pages/Health.tsx`, `src/pages/Dashboard.tsx`)
  - `marketing` - admin marketing/ad media feed (`src/pages/admin/Marketing.tsx`)
  - Trainer profile assets bucket (public, name defined by a `BUCKET` constant) - trainer photo, CV, and certificate uploads (`src/components/trainer/TrainerProfileForm.tsx`, `src/components/admin/TrainerReviewDialog.tsx`); backing table `trainer_certificates` and new `trainers` columns are added by `supabase/migrations/20260728120000_trainer_profile_details.sql` (not yet run live as of this analysis)
  - `society-images` (public) - society photos for the polls sub-app, uploaded via `scripts/upload-society-images.mjs` and referenced as full Supabase Storage URLs in `src/data/societies.json` and `poll_societies.image_url`

**Caching:**
- TanStack React Query (`@tanstack/react-query` 5.83.0) provides in-memory client-side query caching over Supabase calls; no external cache service (Redis, etc.)

## Authentication & Identity

**Auth Model — three distinct, non-Supabase-Auth mechanisms coexist:**

1. **Customers:** Custom auth — phone + date-of-birth login, no password. Session is a plain localStorage flag (`fitved_custom_user`, `fitved_custom_role`), NOT a Supabase Auth session (Supabase Auth adoption is explicitly disabled: `detectSessionInUrl: false` in `src/integrations/supabase/client.ts`, and `AuthContext` never listens for `supabase.auth` state changes). Firebase is used only transiently, to verify the signup email via `sendSignInLinkToEmail`/`signInWithEmailLink`.
2. **Trainers:** Firebase Authentication owns all credential flows — email/password, Google OAuth, and password reset (`src/contexts/AuthContext.tsx`, `src/pages/ResetPassword.tsx` handles Firebase `oobCode` confirmation). A trainer's Firebase-authenticated email is matched (case-insensitive) against the Supabase `trainers.email` column to resolve the app session; `trainers.active` (boolean) gates verified vs. pending status.
3. **Admins:** Custom auth against Supabase `admins` table — phone + **plaintext password** stored in `admins.password` column (single admin account as of this analysis). Not migrated to Firebase.

**Authorization:**
- Row-Level Security (RLS) on Supabase tables is reported as **open/wide** on the anon key (per project memory: "genuine, unresolved data-exposure hole" — the publicly-shipped anon key can read/write/delete broadly because FK relationships to `auth.users` were never usable given custom auth). See CONCERNS.md for detail; this is a known, tracked security gap, not a false positive.

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Bugsnag, or similar SDK found in dependencies or source)

**Logs:**
- Console-based only (`console.warn`/`console.error` scattered through app code and build scripts, e.g. `scripts/generate-booking-config.js`); no centralized logging service

## CI/CD & Deployment

**Hosting:**
- Vercel (primary app) - inferred from `vercel.json` rewrite/redirect rules and a recent fix commit specifically about Vercel build behavior (`548e21d fix(build): read process.env and fallback gracefully in generate-booking-config to prevent Vercel build failures`)
- The embedded polls sub-app (`Society Poles`) is deployed only as a static export baked into this repo's `public/societies/` — it does not run its own Next.js server in production; it is likely NOT separately hosted (no evidence of a live Next.js deployment target for it)

**CI Pipeline:**
- No CI config files found (no `.github/workflows`, no `vercel.json` build hooks beyond the default framework preset) — Vercel's own git-integration build likely runs `npm run build` on push

## Environment Configuration

**Required env vars (names only):**
- `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`

**Secrets location:**
- `.env` at repo root (gitignored) for local dev; Vercel project environment variables for production/preview deploys
- `scripts/firebase-service-account.json` (gitignored, not present by default) — a Firebase Admin SDK service account key needed only to run the one-off `scripts/migrate-trainers-to-firebase.mjs` script; must be manually downloaded by whoever runs it
- The embedded polls sub-app has its own separate `.env.local` (outside this repo, at `/Users/harshsaini/Desktop/New project/Society Poles/.env.local`) pointing at the same main Supabase project

## Webhooks & Callbacks

**Incoming:**
- None detected — no webhook receiver endpoints found (app has no backend server component; all data access is direct Supabase client calls from the browser)

**Outgoing:**
- None detected as true webhooks. Firebase email-link (`continueUrl`) and password-reset action links function as callback URLs but are Firebase-managed, not custom webhook infrastructure.

---

*Integration audit: 2026-07-30*
