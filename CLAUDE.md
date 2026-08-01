<!-- GSD:project-start source:PROJECT.md -->
## Project

**FitVed — Find Trainers System**

A "Find Trainers" discovery and marketplace experience bolted onto the existing **FitVed** client portal (React 18 + Vite + TypeScript + Tailwind + shadcn/ui, Supabase backend). It lets prospective clients browse, filter, and view rich public profiles of FitVed's certified personal trainers & yoga coaches, and lets trainers build those profiles from their existing dashboard. It replaces the current navbar "Trainers" link (which scrolls to a static team section) with a real, conversion-focused trainer directory. It must look and feel like it was always part of FitVed — same navy/orange branding, typography, buttons, cards, spacing, shadows, and radii. No redesign of the existing site.

**Core Value:** A visitor can find a credible, verified FitVed trainer that matches their needs (location, availability, specialization) and land on a premium profile that drives them to **book a free trial**. If everything else fails, the listing → profile → Book Trial funnel must work.

### Constraints

- **Tech stack**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + TanStack React Query + Supabase. No new frameworks.
- **Design**: Must reuse the existing FitVed design system exactly — no redesign, no new visual language.
- **Compatibility**: Must not break existing trainer dashboard, admin trainers, auth, or the societies sub-site.
- **Migrations**: Additive only, `IF NOT EXISTS`, no data loss; user runs the SQL; features degrade gracefully until then.
- **Security**: Anon-key + open-RLS reality — public pages are read-only; lead capture must use an anon-writable policy.
- **UX**: Responsive, accessible, SEO-friendly, skeleton loaders, empty states, subtle animations, no lorem ipsum, no Send Message.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Repository Shape
## Languages
- TypeScript 5.8.3 (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`) - all `src/` application code (`.ts`/`.tsx`)
- Note: `tsconfig.app.json`-driven compiler options relax strictness: `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals/Parameters: false` — the codebase does not enforce strict typing
- JavaScript (ESM, `.js`/`.mjs`) - build/tooling scripts (`scripts/generate-booking-config.js`, `scripts/migrate-trainers-to-firebase.mjs`, `scripts/seed-poll-db.mjs`, `scripts/upload-society-images.mjs`) and a vanilla-JS booking widget (`public/booking-modal.js`) embedded into static HTML pages
- SQL - `supabase/migrations/*.sql` (31 migration files, Postgres/Supabase dialect with RLS policies)
- HTML - static SEO landing pages in `public/*.html` (e.g. `public/personal-training.html`, `public/faqs.html`) served alongside the SPA
## Runtime
- Node.js (version not pinned — no `.nvmrc`/`.node-version` file found; `@types/node` targets Node 22 typings)
- Browser (client-side SPA; no server runtime in the app itself beyond Vite dev server)
- Mixed lockfiles present: `package-lock.json` (npm) AND `bun.lockb` (Bun) both exist at repo root — indicates the project originated on Bun (Lovable-scaffolded) but has since been used with npm. Treat `package-lock.json` as authoritative for CI/Vercel builds.
- Lockfile: present (both)
## Frameworks
- React 18.3.1 + React DOM 18.3.1 - UI framework
- Vite 5.4.19 (`vite.config.ts`) - build tool / dev server, using `@vitejs/plugin-react-swc` 3.11.0 for fast-refresh compilation
- React Router DOM 6.30.1 (`src/lib/routes.ts` and page-level routing) - client-side routing
- Tailwind CSS 3.4.17 (`tailwind.config.ts`, `postcss.config.js`) - styling, with `tailwindcss-animate` and `@tailwindcss/typography` plugins
- shadcn/ui (`components.json`, `src/components/ui/`) - component library built on Radix UI primitives (`@radix-ui/react-*`, ~24 packages: dialog, dropdown-menu, tabs, toast, select, accordion, etc.)
- React Hook Form 7.61.1 + `@hookform/resolvers` 3.10.0 + Zod 3.25.76 - form state and schema validation
- TanStack React Query 5.83.0 - server-state/data-fetching cache layer over Supabase calls
- `lovable-tagger` 1.1.13 (dev-only Vite plugin, active only in `mode === "development"`) - indicates project was originally scaffolded/edited via Lovable.dev
- Vitest 3.2.4 (`vitest.config.ts`) - test runner, jsdom environment
- `@testing-library/react` 16.0.0 + `@testing-library/jest-dom` 6.6.0 - component testing utilities
- Only one test file currently exists: `src/test/example.test.ts` (setup at `src/test/setup.ts`) — test coverage is minimal
- ESLint 9.32.0 + `typescript-eslint` 8.38.0 (`eslint.config.js`, flat config) - linting, with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`; note `@typescript-eslint/no-unused-vars` is explicitly turned off
- PostCSS 8.5.6 + Autoprefixer 10.4.21 - CSS processing pipeline for Tailwind
## Key Dependencies
- `@supabase/supabase-js` 2.105.1 - primary database/backend client (`src/integrations/supabase/client.ts`); used for all data (profiles, plans, billing, trainers, societies, etc.) under an **anon/publishable key with open RLS** (see INTEGRATIONS.md and CONCERNS)
- `firebase` 12.16.0 - trainer authentication only (email/password, Google sign-in, email-link) via `src/integrations/firebase/client.ts` and `src/contexts/AuthContext.tsx`
- `date-fns` 3.6.0 - date math for session/plan scheduling logic (`src/lib/dates.ts`, `src/lib/sessionPlan.ts`, `src/lib/trainerSessions.ts`)
- `zod` 3.25.76 - runtime schema validation paired with React Hook Form
- `sonner` 1.7.4 - toast notifications app-wide
- `recharts` 2.15.4 - charts (admin/trainer dashboards, earnings/plan visualizations)
- `embla-carousel-react` 8.6.0 - carousels on marketing pages
- `cmdk` 1.1.1 - command palette component
- `react-day-picker` 8.10.1 - calendar/date-picker UI (booking, plans, off-times)
- `input-otp` 1.4.2 - present as a dependency but the app's actual auth flow does NOT use numeric OTP (per architecture memory: link-based Firebase auth only) — likely a leftover from the shadcn/ui scaffold
- `vaul` 0.9.9 - drawer component primitive
- `next-themes` 0.3.0 - theme (light/dark) switching support, present though app appears primarily single-themed
## Configuration
- `.env` file present at repo root (gitignored: `.gitignore` excludes `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.staging`) — contains only public/publishable keys, no server secrets
- Required Vite env vars (names only, values never read): `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- Vercel deployment also has `VITE_FIREBASE_*` env vars configured (per project memory)
- A custom prebuild step, `scripts/generate-booking-config.js`, reads `process.env`/`.env` at dev/build time and writes a gitignored `public/booking-config.js` (`window.FVConfig = { url, key }`) so the static, non-bundled `public/booking-modal.js` (used on plain HTML SEO pages) can call the Supabase REST API directly via `fetch()` without a bundler or SDK
- `vite.config.ts` — path alias `@` → `./src`; custom middleware plugins for (a) clean-URL rewriting of static SEO HTML pages (`CLEAN_URL_MAP`, e.g. `/personal-training` → `personal-training.html`) and (b) serving the embedded `public/societies` static export at `/societies/*` in dev/preview (production serving is handled by `vercel.json` rewrites instead)
- `vercel.json` — `cleanUrls: true`; SPA fallback rewrite `"/((?!societies)(?!.*\\.html$).*)" → "/"` deliberately excludes `/societies*` and `*.html` paths so the static sub-app and static SEO pages bypass the SPA catch-all; permanent redirects map legacy `.html` URLs to clean URLs
- `tailwind.config.ts` — Tailwind theme/tokens config
- `components.json` — shadcn/ui config (style: default, baseColor: slate, path aliases matching `tsconfig`)
## Platform Requirements
- Node.js + npm (or Bun) to run Vite dev server (`npm run dev`, port 8080 per `vite.config.ts` `server.host/port`)
- `npm run dev` / `npm run build` both run `node scripts/generate-booking-config.js` first (prebuild step)
- Deployment target: Vercel (evidenced by `vercel.json` config, redirects/rewrites tuned for Vercel's routing model, and prior commit `fix(build): read process.env and fallback gracefully in generate-booking-config to prevent Vercel build failures`)
- Static SPA build output served by Vercel; no custom Node server required at runtime
## Embedded Sub-App: "Society Poles" (Next.js polls micro-site)
- Next.js 16.2.11 (App Router), React 19.2.4 / React DOM 19.2.4 — a newer, incompatible React major version than the root app's React 18; kept fully isolated since it never enters the root app's bundle
- TypeScript 5, Tailwind CSS 4 (`@tailwindcss/postcss`)
- `@supabase/supabase-js` 2.110.8 — its own Supabase client, now pointed at the **same** main FitVed Supabase project (`eoexvygolxoygoqfrjzc`) using `poll_`-prefixed tables (`poll_societies`, `poll_slots`, `poll_responses`, `poll_area_requests`)
- `framer-motion`, `canvas-confetti`, `recharts` 3, `xlsx`, `react-hook-form` 7 + `zod` 4 (major-version-newer than root app's zod 3)
- Build config: `next.config.ts` sets `output: "export"`, `basePath: "/societies"`, `trailingSlash: true`, `images.unoptimized: true`
- `scripts/build-societies.sh` (in this repo) runs `npm run build` inside the external polls project directory, copies its `out/` to this repo's `public/societies/`, then flattens `public/societies/societies/*.jpg` up one directory level
- To update the embedded sub-app: edit the external project, then re-run `scripts/build-societies.sh` and commit the regenerated `public/societies/`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Components: `PascalCase.tsx` — e.g. `src/components/trainer/TrainerProfileForm.tsx`, `src/pages/admin/Trainers.tsx`, `src/contexts/AuthContext.tsx`
- shadcn/ui primitives: `kebab-case.tsx` under `src/components/ui/` — e.g. `src/components/ui/alert-dialog.tsx`, `src/components/ui/dropdown-menu.tsx` (these files still export PascalCase components; only the filename is kebab-case, matching shadcn's own convention)
- Hooks: `use-kebab-case.tsx`/`.ts` or `useCamelCase.ts` (both exist) — e.g. `src/hooks/use-mobile.tsx`, `src/hooks/use-toast.ts`, `src/hooks/useProfile.ts`
- Library/utility modules: `camelCase.ts` under `src/lib/` — e.g. `src/lib/incomeAllocation.ts`, `src/lib/sessionPlan.ts`, `src/lib/trainerSessions.ts`, `src/lib/phoneAuth.ts`, `src/lib/specializations.ts`
- Store modules: `camelCase.tsx` under `src/stores/` — e.g. `src/stores/pauseStore.tsx`
- Feature grouping under `src/components/`: `admin/`, `admin/customer-tabs/`, `dashboard/`, `plan/`, `trainer/`, `ui/`
- Route-aligned grouping under `src/pages/`: flat marketing/customer pages at top level, `pages/admin/` for admin-only screens
- `camelCase` for all functions and hooks (`normalizePhone`, `recalculatePlanDates`, `formatDate`, `useReveal`)
- Custom hooks always prefixed `use` (`useProfile`, `useAuth`, `useReveal`, `useIsMobile`)
- `camelCase` for local state and variables (`serviceAreas`, `photoDeleted`, `cvFile`)
- `SCREAMING_SNAKE_CASE` for module-level constants/config objects — e.g. `NAV_DROPDOWNS`, `SPECIALIZATIONS` (`src/lib/specializations.ts`), `leadSchema` is the exception (schema objects stay camelCase)
- `PascalCase` for types/interfaces, no `I` prefix — e.g. `interface AuthContextValue`, `type AppRole = "client" | "trainer" | "admin"`, `type CertRow`, `type Seed`
- Union-of-string-literals preferred over enums for role/status fields (`"client" | "trainer" | "admin"`)
## Code Style
- No Prettier config present (`.prettierrc*` not found) — formatting is whatever the editor/eslint produces; double quotes are used consistently by convention (not enforced by a rule)
- No `noUnusedLocals`/`noUnusedParameters`/`noImplicitAny` enforcement — see TypeScript strictness below
- `eslint.config.js` (flat config, ESLint 9 + typescript-eslint 8)
- Extends `js.configs.recommended` and `tseslint.configs.recommended`
- `react-hooks` recommended rules enabled (exhaustive-deps etc. at whatever the plugin's recommended level sets)
- `react-refresh/only-export-components` set to `"warn"` (allows constant exports, e.g. shadcn's `buttonVariants`)
- **`@typescript-eslint/no-unused-vars` is explicitly turned OFF** — unused vars/params will not fail lint or CI
- Run: `npm run lint` (`eslint .`)
- `tsconfig.app.json` (the config that actually covers `src/`) sets:
- This is a **loose/non-strict TypeScript setup**. Do not assume null-safety or exhaustive type-checking will catch mistakes — `any` and implicit nulls pass silently.
- Casts to `any` are a normal, accepted pattern in this codebase (not a code smell to eliminate), most commonly `(supabase as any)` or `supabase.from(x) as any` — see Supabase section below.
- Typecheck command: `npx tsc --noEmit -p tsconfig.app.json` (currently passes clean with 0 errors as of this analysis)
- Build command: `npm run build` — note this first runs `node scripts/generate-booking-config.js` (a prebuild step reading `process.env`) before `vite build`
## Import Organization
- `@/*` → `./src/*` (defined in `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, and `components.json`)
- Always import via `@/...`, never relative `../../` chains across feature folders
## Supabase Query Pattern (critical, project-specific)
- `queryKey` is an array starting with a descriptive string, followed by the id(s) it's scoped to.
- Default to `data ?? []` / `data ?? null` fallback rather than leaving `undefined`.
- Use `enabled: !!user` (or similar) to gate queries on auth/session readiness (`src/hooks/useProfile.ts`).
- Use `.maybeSingle()` for "may or may not exist" lookups; `.single()` only when existence is guaranteed.
- Validate input inside `mutationFn` by throwing `new Error("message")` — this message becomes the toast text in `onError`.
- Supabase errors are checked explicitly (`if (error) throw error`) rather than relying on `.throwOnError()`.
- A dedicated `invalidate*` helper function fans out `queryClient.invalidateQueries` calls across every queryKey that could be affected by the mutation (see `PausesTab.tsx`'s `invalidatePauses`). Follow this pattern instead of invalidating ad hoc inline.
## Toast Notifications (sonner)
- Import: `import { toast } from "sonner"` — never the shadcn `use-toast` hook/Radix Toast for new code (that hook exists in `src/hooks/use-toast.ts` for legacy/shadcn compatibility only; prefer `sonner` for anything new).
- `toast.success("...")` for mutation success, `toast.error("...")` for failures, `toast.info("...")` for neutral notices (e.g. "Redirecting to Google…").
- Error toast pattern: `onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")` — always narrow `unknown`/`Error` before reading `.message`.
## Error Handling
- Supabase calls: destructure `{ data, error }`, check `if (error) throw error` (queries/mutations) or `if (error) return { error: error.message }` (auth-style functions that return a result object instead of throwing).
- Auth flows in `src/contexts/AuthContext.tsx` never throw across the public API — every method returns `{ error: string | null }` (optionally `notice?: string`), and callers branch on `error`. This is deliberate so calling UI code doesn't need try/catch for expected failure paths (wrong password, existing account, etc.).
- Third-party SDK errors (Firebase) are narrowed via `(e as { code?: string })?.code` and mapped to specific human-readable messages per Firebase error code (see the long `if (code === "auth/...")` chains in `AuthContext.tsx`) — follow this pattern when adding new Firebase auth flows rather than surfacing raw SDK error text.
- Non-critical failures are swallowed with a comment explaining why, e.g. `console.warn("user_roles insert failed:", roleError.message); // Don't block login — role can be re-linked later`.
- No app-wide `ErrorBoundary` component exists. No centralized error/logging service is wired in (no Sentry/LogRocket etc. found).
## Comments
- Comments are used liberally to explain **why**, especially around non-obvious auth/state decisions (custom localStorage auth vs Supabase Auth, why a cast is needed, why a query is invalidated). Follow this style — a short "why" comment above any workaround or cast.
- Section-divider comments using box-drawing characters appear in larger files, e.g.:
- No JSDoc/TSDoc convention in use — comments are plain `//` or `/* */`.
## Function Design
## Component Design
## Module Design
- Pages: `export default function PageName()`
- Reusable components/hooks/contexts: named exports (`export function AuthProvider`, `export function useAuth`, `export function PausesTab`)
- Library functions: named exports, no default exports in `src/lib/`
## FitVed Design System (Tailwind/shadcn)
- shadcn/ui configured via `components.json`: style `"default"`, base color `slate`, CSS variables enabled, no prefix, aliases `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`.
- All theme colors are HSL CSS variables defined in `src/index.css` (`--background`, `--primary`, `--accent`, etc.) and consumed through `tailwind.config.ts` `theme.extend.colors` (e.g. `primary: { DEFAULT: "hsl(var(--primary))" }`). Add new semantic colors this way, not as raw hex in components.
- Brand-specific flat hex utilities also exist directly in `tailwind.config.ts` outside the HSL-variable system: `fv-navy` (`#1E3A5F`), `fv-orange` (`#FF6B35` — note this is the actual current value; it does not match `#f0a720`, so check `tailwind.config.ts` directly before assuming a specific hex), `fv-neutral` (`#F5F5F5`), `fv-text` (`#333333`), `fv-success` (`#4CAF50`). Use `bg-fv-navy`, `text-fv-orange`, etc.
- Fonts: `font-display` → Fraunces (headings, `h1`–`h4` styled globally in `src/index.css` `@layer base`), `font-sans` → Outfit (body default). Both declared in `tailwind.config.ts` `fontFamily` and hardcoded again as the `body`/`h1-h4` `font-family` in `src/index.css` — keep both in sync when changing fonts.
- Custom utility classes and animations are added directly in `src/index.css` under `@layer utilities` (e.g. `.bg-gradient-brand`, `.shadow-soft`, `.fluid-container-hero`, `.fluid-section-m`) rather than only via Tailwind config — check `index.css` for existing fluid-spacing/gradient utilities before adding new ones.
- Dark mode variables exist (`.dark { ... }` block) via `darkMode: ["class"]`, but no in-app theme toggle was found wired to it (`next-themes` is a dependency, used at `src/components/ui/sidebar.tsx`-style low level only) — treat dark mode as scaffolded but not an active user-facing feature.
## Third-Party UI Kit
- `src/components/ui/` contains ~50 shadcn/ui generated primitives (button, dialog, form, table, select, calendar, chart, sidebar, etc.) — treat these as vendored/generated; prefer composing them rather than editing internals unless fixing a specific shadcn bug.
- Icons: `lucide-react` exclusively — no other icon library in use.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- Route-based code organization: one file per page under `src/pages/`, grouped by role (`admin/`, top-level for client, trainer pages named `Trainer*.tsx`).
- No repository/service/API layer — every page or component owns its own `useQuery`/`useMutation` calls against `supabase.from(...)`.
- Two independent identity systems bridged by a single custom session: Supabase Auth is never used for sessions (`detectSessionInUrl: false`); Firebase Auth is the credential store for trainers only; the actual "logged in" state is `localStorage["fitved_custom_user"/"fitved_custom_role"]` set by `AuthContext`.
- Cross-cutting business rules (plan date recalculation, referral earnings, session accounting) live as pure/async helper modules in `src/lib/*.ts`, imported by whichever page needs them — not behind a service abstraction.
- The repo hosts three distinct web surfaces from one Vite build: the React SPA (`src/`), static hand-written SEO landing pages (`public/*.html`), and an embedded external Next.js static export (`public/societies/`) served via custom Vite middleware.
## Layers
- Purpose: decide which page renders for a URL and enforce role access.
- Location: `src/App.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/AppLayout.tsx`, `src/lib/routes.ts`
- Contains: route table, redirect logic, `homeForRole()` mapping, shared chrome (sidebar/topbar/mobile nav).
- Depends on: `AuthContext` (session/role state).
- Used by: every authenticated page.
- Purpose: screen-level composition, data fetching, and mutations for one feature area.
- Location: `src/pages/*.tsx`, `src/pages/admin/*.tsx`, `src/components/{admin,dashboard,trainer,plan}/*.tsx`
- Contains: React Query hooks, form state, feature-specific business logic (often large single files, e.g. `src/pages/admin/Trainers.tsx` ~1400 lines, `src/pages/TrainerDashboard.tsx` ~1750 lines, `src/pages/Landing.tsx` ~2670 lines).
- Depends on: `src/integrations/supabase/client.ts`, `src/lib/*.ts` helpers, `src/hooks/*`, shadcn `src/components/ui/*`.
- Used by: the router.
- Purpose: pure calculation/helper functions shared across pages, decoupled from React.
- Location: `src/lib/dates.ts`, `src/lib/sessionPlan.ts`, `src/lib/trainerSessions.ts`, `src/lib/incomeAllocation.ts`, `src/lib/referrals.ts`, `src/lib/phoneAuth.ts`, `src/lib/specializations.ts`, `src/lib/routes.ts`, `src/lib/utils.ts`
- Contains: plan end-date math, session-count derivation, referral earnings computation (derived, never stored), phone normalization, the shared specializations list used by both trainer self-edit and admin edit forms.
- Depends on: nothing app-specific (pure functions operating on data passed in).
- Used by: pages, `pauseStore`, admin trainer tooling.
- Purpose: single configured client per external service.
- Location: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `src/integrations/firebase/client.ts`
- Contains: Supabase client (typed via generated `Database` type, custom-auth flags), Firebase app/auth/GoogleAuthProvider singletons.
- Depends on: `import.meta.env.VITE_*` vars (see STACK.md).
- Used by: virtually every page/component and `AuthContext`.
- Purpose: shadcn/ui + Radix wrapper components (Button, Dialog, Select, Table, Sidebar, etc.).
- Location: `src/components/ui/*.tsx`
- Contains: unmodified-pattern shadcn generated components, styled via Tailwind + `class-variance-authority`.
- Depends on: Radix primitives, `src/lib/utils.ts` (`cn()` classnames helper).
- Used by: every feature component.
## Data Flow
### Primary authenticated request path (client dashboard example)
### Trainer profile data flow
### Auth data flow (dual identity system)
- Server state: TanStack React Query per-component (`staleTime: 30s`, `gcTime: 10min`, `refetchOnWindowFocus:false`, configured once in `src/App.tsx:43-52`); mutations always call `invalidateQueries` to bypass staleness.
- Auth/session state: React Context (`AuthContext`) backed by `localStorage`, not React Query.
- Client-pause domain state: a second dedicated context/provider, `PauseProvider` (`src/stores/pauseStore.tsx`), which also exports the standalone async function `recalculatePlanDates(userId)` used both by client-facing pause flows and admin trainer off-time/make-up-class mutations.
- No Redux/Zustand/Jotai — "stores" in `src/stores/` are React Context providers, not external state libraries.
## Key Abstractions
- Purpose: the three-way user role — `"client" | "trainer" | "admin"` — that drives routing, sidebar contents, and per-table access patterns.
- Examples: `src/lib/routes.ts`, `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/AppSidebar.tsx`.
- Pattern: plain string union, not an enum; checked with `===`/`.includes()` everywhere (no central RBAC matrix).
- Purpose: derive a customer's plan end date and a trainer's monthly session counts from raw rows (plans, pauses, trainer off-times, comp/make-up classes, manual admin adjustments) — never stored as a precomputed total.
- Examples: `calculatePlanEndDate`, `calculatePlanRenewalDate`, `extendEndDateBySessions`, `countLostTrainingDays` (`src/lib/sessionPlan.ts`); `trainerSessionsForMonth`, `recentMonthKeys`, `monthLabel`, `trainerMonthActivity` (`src/lib/trainerSessions.ts`); `recalculatePlanDates` (`src/stores/pauseStore.tsx`).
- Pattern: pure calculation functions taking plain data + today's date string, called from React Query `queryFn`s or mutation `onSuccess` handlers; recalculation happens per-plan (not just the latest plan) so retroactive backdating reconciles correctly.
- Purpose: trainer referral commission is computed on read, not persisted, from `billing_history` matched by phone.
- Examples: `computeReferrals()` in `src/lib/referrals.ts`.
- Pattern: 5% of net billing (payments − refunds) for billing dated on/after the referral's `created_at`; keeps the DB as the single source of truth and avoids drift.
- Purpose: let the frontend ship ahead of a migration being manually run against the live Supabase project (the live DB and repo migrations can diverge — see memory).
- Examples: `TrainerProfileForm.tsx` casts `supabase as any` and treats a failed `select` as a `__notReady` sentinel rather than a hard error; `src/pages/admin/Trainers.tsx` mutations catch "relation does not exist"/"schema cache" errors and show an instructive toast ("run the X migration in Supabase").
- Pattern: always feature-detect new columns/tables at the query layer; never assume the generated `src/integrations/supabase/types.ts` is authoritative for very recent columns.
- Purpose: serve a foreign Next.js static export (`public/societies/`, a separate "Society Poll" Next.js app maintained outside this repo) and clean marketing URLs (`public/*.html`) from the same dev server / preview server as the SPA.
- Examples: `serveCleanUrls()` and `serveSocieties()` middleware functions in `vite.config.ts`.
- Pattern: `configureServer`/`configurePreviewServer` Vite plugin hooks intercept specific URL prefixes before the SPA history fallback claims them; production routing does the equivalent via `vercel.json` rewrites (`"/((?!societies)(?!.*\\.html$).*)" → "/"`).
## Entry Points
- Location: `src/main.tsx`
- Triggers: Vite/browser bootstrap — single `createRoot(...).render(<App/>)` call.
- Responsibilities: mount the React tree; no other setup here (providers live inside `App.tsx`).
- Location: `src/App.tsx`
- Triggers: rendered once by `main.tsx`.
- Responsibilities: instantiate `QueryClient`, wrap the tree in `QueryClientProvider` → `TooltipProvider` → toasters → `BrowserRouter` → `AuthProvider` → `PauseProvider` → `<Routes>`; declare every route including public marketing redirects, clean static-page redirects, and role-gated app routes.
- Location: `public/societies/` (built output only; source lives outside this repo)
- Triggers: any request to `/societies` or `/societies/*` — intercepted by the Vite middleware in dev/preview, or served directly by Vercel/static hosting in production (`vercel.json` excludes `/societies*` from the SPA rewrite).
- Responsibilities: a fully separate static-exported app (own Supabase tables prefixed `poll_*` in the same Postgres project) — rebuilt via `scripts/build-societies.sh`, not by this repo's normal build.
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
### `supabase as any` casts to bypass generated types
## Error Handling
- Auth methods (`signIn`, `signUp`, `signInWithPhone`, etc.) return `{ error: string | null }` rather than throwing, with Firebase error `.code` values mapped to specific, instructive user-facing messages (e.g. `auth/operation-not-allowed` → "Enable it in Firebase console → …").
- React Query mutations use `onError: (e) => toast.error(...)`, frequently pattern-matching the error message string to detect "table/column doesn't exist yet" (regex like `/schema cache|does not exist|Could not find|relation/i`) and showing a migration-specific toast instead of a raw Postgres error.
- Non-critical writes (e.g. `user_roles` insert during signup) log a `console.warn` and continue rather than failing the whole flow — explicitly commented as "don't block login, can be re-linked later".
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
