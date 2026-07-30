<!-- refreshed: 2026-07-30 -->
# Architecture

**Analysis Date:** 2026-07-30

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         BrowserRouter (App.tsx)                          │
│  `src/App.tsx` — top-level route table, QueryClient, Auth/Pause providers│
├──────────────────────┬──────────────────────┬───────────────────────────┤
│   Public / marketing  │   Protected app SPA   │   Static SEO + embedded   │
│   `src/pages/Landing  │   `AppLayout` +       │   sub-sites (see below)   │
│   .tsx`, Corporate,   │   `ProtectedRoute`    │   `public/*.html`,         │
│   FaqsPage            │   role-gated routes   │   `public/societies/`     │
└──────────┬────────────┴──────────┬───────────┴───────────────────────────┘
           │                       │
           ▼                       ▼
┌─────────────────────────┐ ┌────────────────────────────────────────────┐
│   AuthContext            │ │  Role-scoped page groups                   │
│  `src/contexts/          │ │  - client: Dashboard/Pause/Plan/Health/     │
│   AuthContext.tsx`        │ │    Profile  `src/pages/*.tsx`               │
│  custom localStorage      │ │  - trainer: TrainerDashboard/               │
│  session + Firebase       │ │    TrainerReferrals/Profile                 │
│  (trainer credentials     │ │    `src/pages/Trainer*.tsx`                 │
│  only) + Supabase          │ │  - admin: Dashboard/Customers/Plans/        │
│  (client/admin data)       │ │    Trainers/Societies/Marketing/Referrals   │
│                            │ │    `src/pages/admin/*.tsx`                  │
└──────────┬─────────────────┘ └───────────────┬──────────────────────────┘
           │                                     │
           ▼                                     ▼
┌───────────────────────────────────────────────────────────────────────┐
│              TanStack React Query (per-page fetch/mutation hooks)      │
│  `useQuery`/`useMutation` calls colocated in each page/component;       │
│  no dedicated repository/service layer — components call Supabase       │
│  directly. Shared read-model helpers in `src/lib/*.ts`.                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Supabase Postgres (anon key, open RLS)  +  Firebase Auth (trainers)    │
│  `src/integrations/supabase/client.ts`, `src/integrations/firebase/     │
│   client.ts`, schema in `supabase/migrations/*.sql`                     │
└───────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App` | Route table, QueryClient config, top-level providers | `src/App.tsx` |
| `AuthProvider` | Custom session (localStorage) + Firebase trainer auth + Supabase lookups | `src/contexts/AuthContext.tsx` |
| `ProtectedRoute` | Session/role gating, redirect to correct home | `src/components/ProtectedRoute.tsx` |
| `AppLayout` | Shared shell (sidebar + top bar + mobile nav + outlet) for all authenticated routes | `src/components/AppLayout.tsx` |
| `AppSidebar` | Role-driven nav item list (client/trainer/admin) | `src/components/AppSidebar.tsx` |
| `PauseProvider` | Client pause-scheduling logic + plan-date recalculation | `src/stores/pauseStore.tsx` |
| `supabase` client | Single Postgres/storage access point, custom-auth flag set | `src/integrations/supabase/client.ts` |
| `firebaseAuth` client | Trainer-only credential/identity provider | `src/integrations/firebase/client.ts` |
| `TrainerProfileForm` | Trainer self-service profile editor (personal info, docs, read-only assignments) | `src/components/trainer/TrainerProfileForm.tsx` |
| Admin `Trainers` page | Trainer CRUD, off-time management, session accounting, Firebase onboarding | `src/pages/admin/Trainers.tsx` |
| Vite dev middleware | Serves clean marketing URLs + embedded Next.js static export | `vite.config.ts` |

## Pattern Overview

**Overall:** Client-heavy SPA with no backend API layer of its own — React components talk directly to Supabase (Postgres via PostgREST + Storage) using the anon key, and to Firebase Auth for trainer credentials. There is no server-side business logic beyond three now-unused Supabase Edge Functions (`supabase/functions/*`) — the memory notes confirm the frontend replaced them with direct table writes.

**Key Characteristics:**
- Route-based code organization: one file per page under `src/pages/`, grouped by role (`admin/`, top-level for client, trainer pages named `Trainer*.tsx`).
- No repository/service/API layer — every page or component owns its own `useQuery`/`useMutation` calls against `supabase.from(...)`.
- Two independent identity systems bridged by a single custom session: Supabase Auth is never used for sessions (`detectSessionInUrl: false`); Firebase Auth is the credential store for trainers only; the actual "logged in" state is `localStorage["fitved_custom_user"/"fitved_custom_role"]` set by `AuthContext`.
- Cross-cutting business rules (plan date recalculation, referral earnings, session accounting) live as pure/async helper modules in `src/lib/*.ts`, imported by whichever page needs them — not behind a service abstraction.
- The repo hosts three distinct web surfaces from one Vite build: the React SPA (`src/`), static hand-written SEO landing pages (`public/*.html`), and an embedded external Next.js static export (`public/societies/`) served via custom Vite middleware.

## Layers

**Routing/shell layer:**
- Purpose: decide which page renders for a URL and enforce role access.
- Location: `src/App.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/AppLayout.tsx`, `src/lib/routes.ts`
- Contains: route table, redirect logic, `homeForRole()` mapping, shared chrome (sidebar/topbar/mobile nav).
- Depends on: `AuthContext` (session/role state).
- Used by: every authenticated page.

**Page/feature layer:**
- Purpose: screen-level composition, data fetching, and mutations for one feature area.
- Location: `src/pages/*.tsx`, `src/pages/admin/*.tsx`, `src/components/{admin,dashboard,trainer,plan}/*.tsx`
- Contains: React Query hooks, form state, feature-specific business logic (often large single files, e.g. `src/pages/admin/Trainers.tsx` ~1400 lines, `src/pages/TrainerDashboard.tsx` ~1750 lines, `src/pages/Landing.tsx` ~2670 lines).
- Depends on: `src/integrations/supabase/client.ts`, `src/lib/*.ts` helpers, `src/hooks/*`, shadcn `src/components/ui/*`.
- Used by: the router.

**Shared domain logic (`src/lib/`):**
- Purpose: pure calculation/helper functions shared across pages, decoupled from React.
- Location: `src/lib/dates.ts`, `src/lib/sessionPlan.ts`, `src/lib/trainerSessions.ts`, `src/lib/incomeAllocation.ts`, `src/lib/referrals.ts`, `src/lib/phoneAuth.ts`, `src/lib/specializations.ts`, `src/lib/routes.ts`, `src/lib/utils.ts`
- Contains: plan end-date math, session-count derivation, referral earnings computation (derived, never stored), phone normalization, the shared specializations list used by both trainer self-edit and admin edit forms.
- Depends on: nothing app-specific (pure functions operating on data passed in).
- Used by: pages, `pauseStore`, admin trainer tooling.

**Integration layer:**
- Purpose: single configured client per external service.
- Location: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `src/integrations/firebase/client.ts`
- Contains: Supabase client (typed via generated `Database` type, custom-auth flags), Firebase app/auth/GoogleAuthProvider singletons.
- Depends on: `import.meta.env.VITE_*` vars (see STACK.md).
- Used by: virtually every page/component and `AuthContext`.

**UI primitives (`src/components/ui/`):**
- Purpose: shadcn/ui + Radix wrapper components (Button, Dialog, Select, Table, Sidebar, etc.).
- Location: `src/components/ui/*.tsx`
- Contains: unmodified-pattern shadcn generated components, styled via Tailwind + `class-variance-authority`.
- Depends on: Radix primitives, `src/lib/utils.ts` (`cn()` classnames helper).
- Used by: every feature component.

## Data Flow

### Primary authenticated request path (client dashboard example)

1. Browser loads `/dashboard` → `App.tsx` route matches `<ProtectedRoute allow={["client","admin"]}><Dashboard/></ProtectedRoute>` inside the `AppLayout` route (`src/App.tsx:87`).
2. `ProtectedRoute` reads `user`/`role`/`loading`/`roleLoading` from `useAuth()` (`src/components/ProtectedRoute.tsx`); until both resolve it renders a loading screen, then either redirects to `/login`, redirects to the role's home (`homeForRole`, `src/lib/routes.ts`), or renders children.
3. `Dashboard` page (`src/pages/Dashboard.tsx`) runs its own `useQuery` calls directly against `supabase.from("profiles"/"plans"/...)`.
4. Data renders through shadcn UI components; mutations call `supabase.from(...).update/insert/delete(...)` then `qc.invalidateQueries([...])` to refresh cached reads (React Query cache, not a global store).

### Trainer profile data flow

1. `Profile` page (`src/pages/Profile.tsx`) checks `role`; if `role === "trainer"` it renders `TrainerProfile` (`src/pages/TrainerProfile.tsx`) instead of the client profile UI.
2. `TrainerProfile` fetches the trainer's own row: `supabase.from("trainers").select("id, name, contact, active").or("user_id.eq.<id>,id.eq.<id>")` — matches on either `user_id` (custom session id) or `id` for legacy rows (`src/pages/TrainerProfile.tsx:16-20`).
3. `TrainerProfileForm` (`src/components/trainer/TrainerProfileForm.tsx`) independently queries the extended profile fields (`education, years_experience, clients_trained, social_link, service_areas, specializations, bio, cv_path, photo_path, updated_at`) from `trainers`, certificates from `trainer_certificates`, assigned societies from `trainer_societies` (joined `societies(id,name)`), and time slots from `trainer_slots` — four independent `useQuery` calls keyed off `trainerId`.
4. `specializations` (text[]) options come from the single shared constant `SPECIALIZATIONS` in `src/lib/specializations.ts`, consumed identically by `TrainerProfileForm` (self-edit) and `src/pages/admin/Trainers.tsx` (admin edit dialog) so both write the same option strings into the same column.
5. Saving (`save` mutation in `TrainerProfileForm.tsx:226-302`) uploads any changed photo/CV/new certificate files to the public Storage bucket `trainer-assets` (paths namespaced `photos/<trainerId>/…`, `cv/<trainerId>/…`, `certificates/<trainerId>/…`), then in one `trainers.update(...)` writes all scalar/array fields plus new photo/cv paths, inserts new `trainer_certificates` rows, and deletes removed ones (both DB rows and their Storage objects).
6. On success it invalidates `["trainer-profile-details", trainerId]`, `["trainer-certificates", trainerId]`, and `["my-trainer-profile"]` so `TrainerProfile.tsx`'s own header query and the form both reflect the change without a full reload.
7. Admin side (`src/pages/admin/Trainers.tsx`): the trainer list query selects `*` from `trainers` (including legacy `specialization` text and new `specializations` text[]; falls back to splitting the legacy field when the array is empty). `TrainerReviewDialog` (`src/components/admin/TrainerReviewDialog.tsx`) reads the same extended fields to show a pending trainer's full submitted profile to the admin before approve/reject.
8. Note: the extended columns/tables are guarded by feature-detection, not schema assumptions — a failed `select` sets a `__notReady` sentinel and the form renders an amber "run this migration" banner (`TrainerProfileForm.tsx:312-320`) rather than crashing, because migrations `20260728120000_trainer_profile_details.sql` and `20260728130000_trainer_profile_fields.sql` may not yet be applied to the live database (see memory: pending manual SQL runs).

### Auth data flow (dual identity system)

1. **Session state of record:** `localStorage["fitved_custom_user"]` (a UUID) + `localStorage["fitved_custom_role"]` (`client`/`trainer`/`admin`). `AuthContext` reads these on mount to hydrate `user`/`role` (`src/contexts/AuthContext.tsx:57-71`). Supabase Auth's own session is deliberately never adopted (`detectSessionInUrl:false` in the Supabase client, and `session` state in context is always `null`).
2. **Client login:** phone + DOB lookup directly against `profiles` table (`signInWithPhone`, `AuthContext.tsx:306-328`) — no password, no Firebase involvement. Client signup inserts into `profiles` + `user_roles` (`signUpWithPhone`, `AuthContext.tsx:330-377`), after Firebase email-link verification proves mailbox ownership (Firebase session from that link is signed out immediately — it never logs the user into the app).
3. **Admin login:** phone + plaintext password check against the `admins` table (`signInAdmin`, `AuthContext.tsx:379-398`) — no Firebase, no Supabase Auth.
4. **Trainer login:** Firebase Auth owns the credential (email/password or Google). After Firebase confirms identity, `authorizeTrainerByEmail`/`resolveGoogleTrainer` look up (or create, for self-signup) a matching `trainers` row by `email` (case-insensitive `ilike`), then call `openSession(trainer.user_id, "trainer")` to write the same two localStorage keys that client/admin sessions use. `trainers.active=false` means "pending admin verification" (not "revoked") and is allowed to sign in with a banner shown by the dashboard.
5. **Role-based landing:** `homeForRole()` (`src/lib/routes.ts`) is the single source of truth mapping `role` → `/dashboard` | `/trainer` | `/admin`, used by `ProtectedRoute` for out-of-role redirects and after login.
6. **Sign out:** clears both localStorage keys, calls `supabase.auth.signOut()` (defensive, since no Supabase session is ever created) and `firebaseSignOut()`, then hard-navigates to `/` (`AuthContext.tsx:456-464`).

**State Management:**
- Server state: TanStack React Query per-component (`staleTime: 30s`, `gcTime: 10min`, `refetchOnWindowFocus:false`, configured once in `src/App.tsx:43-52`); mutations always call `invalidateQueries` to bypass staleness.
- Auth/session state: React Context (`AuthContext`) backed by `localStorage`, not React Query.
- Client-pause domain state: a second dedicated context/provider, `PauseProvider` (`src/stores/pauseStore.tsx`), which also exports the standalone async function `recalculatePlanDates(userId)` used both by client-facing pause flows and admin trainer off-time/make-up-class mutations.
- No Redux/Zustand/Jotai — "stores" in `src/stores/` are React Context providers, not external state libraries.

## Key Abstractions

**Role type (`AppRole`):**
- Purpose: the three-way user role — `"client" | "trainer" | "admin"` — that drives routing, sidebar contents, and per-table access patterns.
- Examples: `src/lib/routes.ts`, `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/AppSidebar.tsx`.
- Pattern: plain string union, not an enum; checked with `===`/`.includes()` everywhere (no central RBAC matrix).

**Plan/session math (`sessionPlan.ts`, `trainerSessions.ts`, `pauseStore.tsx`):**
- Purpose: derive a customer's plan end date and a trainer's monthly session counts from raw rows (plans, pauses, trainer off-times, comp/make-up classes, manual admin adjustments) — never stored as a precomputed total.
- Examples: `calculatePlanEndDate`, `calculatePlanRenewalDate`, `extendEndDateBySessions`, `countLostTrainingDays` (`src/lib/sessionPlan.ts`); `trainerSessionsForMonth`, `recentMonthKeys`, `monthLabel`, `trainerMonthActivity` (`src/lib/trainerSessions.ts`); `recalculatePlanDates` (`src/stores/pauseStore.tsx`).
- Pattern: pure calculation functions taking plain data + today's date string, called from React Query `queryFn`s or mutation `onSuccess` handlers; recalculation happens per-plan (not just the latest plan) so retroactive backdating reconciles correctly.

**Derived (never-stored) earnings (`referrals.ts`):**
- Purpose: trainer referral commission is computed on read, not persisted, from `billing_history` matched by phone.
- Examples: `computeReferrals()` in `src/lib/referrals.ts`.
- Pattern: 5% of net billing (payments − refunds) for billing dated on/after the referral's `created_at`; keeps the DB as the single source of truth and avoids drift.

**Feature-flagged schema access:**
- Purpose: let the frontend ship ahead of a migration being manually run against the live Supabase project (the live DB and repo migrations can diverge — see memory).
- Examples: `TrainerProfileForm.tsx` casts `supabase as any` and treats a failed `select` as a `__notReady` sentinel rather than a hard error; `src/pages/admin/Trainers.tsx` mutations catch "relation does not exist"/"schema cache" errors and show an instructive toast ("run the X migration in Supabase").
- Pattern: always feature-detect new columns/tables at the query layer; never assume the generated `src/integrations/supabase/types.ts` is authoritative for very recent columns.

**Static-site embedding via Vite middleware:**
- Purpose: serve a foreign Next.js static export (`public/societies/`, a separate "Society Poll" Next.js app maintained outside this repo) and clean marketing URLs (`public/*.html`) from the same dev server / preview server as the SPA.
- Examples: `serveCleanUrls()` and `serveSocieties()` middleware functions in `vite.config.ts`.
- Pattern: `configureServer`/`configurePreviewServer` Vite plugin hooks intercept specific URL prefixes before the SPA history fallback claims them; production routing does the equivalent via `vercel.json` rewrites (`"/((?!societies)(?!.*\\.html$).*)" → "/"`).

## Entry Points

**`src/main.tsx`:**
- Location: `src/main.tsx`
- Triggers: Vite/browser bootstrap — single `createRoot(...).render(<App/>)` call.
- Responsibilities: mount the React tree; no other setup here (providers live inside `App.tsx`).

**`src/App.tsx`:**
- Location: `src/App.tsx`
- Triggers: rendered once by `main.tsx`.
- Responsibilities: instantiate `QueryClient`, wrap the tree in `QueryClientProvider` → `TooltipProvider` → toasters → `BrowserRouter` → `AuthProvider` → `PauseProvider` → `<Routes>`; declare every route including public marketing redirects, clean static-page redirects, and role-gated app routes.

**`public/societies/` (embedded Next.js export):**
- Location: `public/societies/` (built output only; source lives outside this repo)
- Triggers: any request to `/societies` or `/societies/*` — intercepted by the Vite middleware in dev/preview, or served directly by Vercel/static hosting in production (`vercel.json` excludes `/societies*` from the SPA rewrite).
- Responsibilities: a fully separate static-exported app (own Supabase tables prefixed `poll_*` in the same Postgres project) — rebuilt via `scripts/build-societies.sh`, not by this repo's normal build.

**`scripts/generate-booking-config.js`:**
- Location: `scripts/generate-booking-config.js`, invoked by `npm run dev`/`npm run build` (see `package.json` scripts) before Vite starts.
- Triggers: every dev/build invocation.
- Responsibilities: reads `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` from `process.env` or `.env`/`.env.local` and writes a gitignored `public/booking-config.js` (`window.FVConfig = {...}`) consumed by the standalone `public/booking-modal.js` widget embedded on the static marketing HTML pages — falls back gracefully (empty strings) instead of failing the build when env vars are absent.

## Architectural Constraints

- **Threading:** Single-threaded browser SPA; no web workers or background threads. All async work is Promise-based (Supabase client calls, React Query).
- **Global state:** `QueryClient` is a module-level singleton created once in `src/App.tsx`. Supabase and Firebase clients are module-level singletons (`src/integrations/supabase/client.ts`, `src/integrations/firebase/client.ts`), guarded against Vite HMR re-initialization (`getApps().length ? getApp() : initializeApp(...)`). Session identity is stored in `localStorage`, which is itself a form of global mutable state read by `AuthContext` on every mount.
- **No RLS / anon-key security model:** Per project memory, the live Supabase project runs with the anon (publishable) key having open/no-op RLS on most tables — any code path (including this codebase's own client-side queries) can read/write/delete essentially any row. This is a known, unresolved exposure, not a pattern to replicate further without awareness.
- **Live-DB / migration drift:** The live Supabase project's actual schema can differ from what's in `supabase/migrations/*.sql` (columns present in production but whose migration hasn't been "run" through the Supabase SQL editor yet, since this repo doesn't use the Supabase CLI migration runner in CI). Always verify column/table existence against the live REST API before assuming a migration file reflects reality — see the `feature-flagged schema access` pattern above.
- **Two auth providers, one session:** Firebase Auth session state and the app's own session (`localStorage` custom keys) are intentionally decoupled — a Firebase session existing does NOT imply an app session exists, and vice versa. Any new trainer-auth code must call `openSession()` explicitly; never assume `onAuthStateChanged` alone implies the user is "logged in" to FitVed.

## Anti-Patterns

### Components as the data-access layer

**What happens:** Individual page/component files (e.g. `src/pages/admin/Trainers.tsx`, `src/pages/TrainerDashboard.tsx`) contain dozens of inline `useQuery`/`useMutation` calls directly embedding Supabase table names and column lists, often duplicated near-identically across files (e.g. the "sessions this month" calculation is queried once per-trainer-detail and once for-all-trainers with almost the same shape).
**Why it's wrong:** Table/column changes require hunting through many large page files instead of one client module; there's no single place to see "everything that reads/writes `trainers`."
**Do this instead:** When adding new trainer-table queries, prefer extending `src/lib/*.ts` helpers (already the pattern for `sessionPlan.ts`/`trainerSessions.ts`) over inlining more ad-hoc `supabase.from(...)` calls in page components, and check existing page files for an equivalent query before adding a new one.

### `supabase as any` casts to bypass generated types

**What happens:** Any query touching columns/tables added since the last `src/integrations/supabase/types.ts` regeneration is written as `(supabase as any).from(...)` (e.g. `trainer_off_times`, `comp_classes`, `trainer_session_adjustments`, and in `TrainerProfileForm.tsx` the whole client is aliased `const sb = supabase as any`).
**Why it's wrong:** Silently defeats TypeScript's column/type checking for those queries — typos in column names fail only at runtime.
**Do this instead:** Regenerate `src/integrations/supabase/types.ts` from the live database after running a new migration, and remove the `as any` cast for that table once types exist; keep the cast only as a temporary bridge, and pair it with the existing "not ready" feature-detection so failures degrade gracefully rather than crash.

## Error Handling

**Strategy:** Supabase/Firebase calls are awaited inline in `queryFn`/`mutationFn`; errors are either thrown (letting React Query's `onError` handle UI feedback) or the `{ data, error }` tuple is destructured and mapped to a user-facing string returned from an `AuthContext` method (never a thrown exception at that boundary).

**Patterns:**
- Auth methods (`signIn`, `signUp`, `signInWithPhone`, etc.) return `{ error: string | null }` rather than throwing, with Firebase error `.code` values mapped to specific, instructive user-facing messages (e.g. `auth/operation-not-allowed` → "Enable it in Firebase console → …").
- React Query mutations use `onError: (e) => toast.error(...)`, frequently pattern-matching the error message string to detect "table/column doesn't exist yet" (regex like `/schema cache|does not exist|Could not find|relation/i`) and showing a migration-specific toast instead of a raw Postgres error.
- Non-critical writes (e.g. `user_roles` insert during signup) log a `console.warn` and continue rather than failing the whole flow — explicitly commented as "don't block login, can be re-linked later".

## Cross-Cutting Concerns

**Logging:** `console.warn`/`console.log` only, no structured logging or remote error tracking (no Sentry/LogRocket integration found).

**Validation:** Mostly inline manual checks inside mutation functions (`if (!name.trim()) throw new Error(...)`) rather than a schema validation library at the data layer, even though `zod` and `react-hook-form` + `@hookform/resolvers` are dependencies (used in some UI form components under `src/components/ui/form.tsx`, not uniformly across every page's raw form state).

**Authentication:** See "Auth data flow" above — centralized in `AuthContext`, but authorization checks (e.g. "trainer must be `active`") are re-implemented per feature (e.g. `TrainerDashboard`'s `isPending`, and `addMakeup`/`addOff` mutations throwing if `!active`) rather than through a shared guard.

---

*Architecture analysis: 2026-07-30*
