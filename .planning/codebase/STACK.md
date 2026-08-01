# Technology Stack

**Analysis Date:** 2026-07-30

## Repository Shape

This repo contains **two applications**:

1. **Primary app (root, `src/`)** — React 18 + Vite + TypeScript SPA + a folder of static SEO/marketing HTML pages (`public/*.html`). This is the app documented in detail below.
2. **Embedded "Society Poles" polls app** — a separate Next.js 16 app whose **source lives outside this repo** at `/Users/harshsaini/Desktop/New project/Society Poles` (own git repo, own `package.json`). Only its **static export output** is committed into this repo at `public/societies/` and served at `/societies/*`. See "Embedded Sub-App" section below for its stack; it is built/deployed independently via `scripts/build-societies.sh`.

## Languages

**Primary:**
- TypeScript 5.8.3 (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`) - all `src/` application code (`.ts`/`.tsx`)
- Note: `tsconfig.app.json`-driven compiler options relax strictness: `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals/Parameters: false` — the codebase does not enforce strict typing

**Secondary:**
- JavaScript (ESM, `.js`/`.mjs`) - build/tooling scripts (`scripts/generate-booking-config.js`, `scripts/migrate-trainers-to-firebase.mjs`, `scripts/seed-poll-db.mjs`, `scripts/upload-society-images.mjs`) and a vanilla-JS booking widget (`public/booking-modal.js`) embedded into static HTML pages
- SQL - `supabase/migrations/*.sql` (31 migration files, Postgres/Supabase dialect with RLS policies)
- HTML - static SEO landing pages in `public/*.html` (e.g. `public/personal-training.html`, `public/faqs.html`) served alongside the SPA

## Runtime

**Environment:**
- Node.js (version not pinned — no `.nvmrc`/`.node-version` file found; `@types/node` targets Node 22 typings)
- Browser (client-side SPA; no server runtime in the app itself beyond Vite dev server)

**Package Manager:**
- Mixed lockfiles present: `package-lock.json` (npm) AND `bun.lockb` (Bun) both exist at repo root — indicates the project originated on Bun (Lovable-scaffolded) but has since been used with npm. Treat `package-lock.json` as authoritative for CI/Vercel builds.
- Lockfile: present (both)

## Frameworks

**Core:**
- React 18.3.1 + React DOM 18.3.1 - UI framework
- Vite 5.4.19 (`vite.config.ts`) - build tool / dev server, using `@vitejs/plugin-react-swc` 3.11.0 for fast-refresh compilation
- React Router DOM 6.30.1 (`src/lib/routes.ts` and page-level routing) - client-side routing
- Tailwind CSS 3.4.17 (`tailwind.config.ts`, `postcss.config.js`) - styling, with `tailwindcss-animate` and `@tailwindcss/typography` plugins
- shadcn/ui (`components.json`, `src/components/ui/`) - component library built on Radix UI primitives (`@radix-ui/react-*`, ~24 packages: dialog, dropdown-menu, tabs, toast, select, accordion, etc.)
- React Hook Form 7.61.1 + `@hookform/resolvers` 3.10.0 + Zod 3.25.76 - form state and schema validation
- TanStack React Query 5.83.0 - server-state/data-fetching cache layer over Supabase calls
- `lovable-tagger` 1.1.13 (dev-only Vite plugin, active only in `mode === "development"`) - indicates project was originally scaffolded/edited via Lovable.dev

**Testing:**
- Vitest 3.2.4 (`vitest.config.ts`) - test runner, jsdom environment
- `@testing-library/react` 16.0.0 + `@testing-library/jest-dom` 6.6.0 - component testing utilities
- Only one test file currently exists: `src/test/example.test.ts` (setup at `src/test/setup.ts`) — test coverage is minimal

**Build/Dev:**
- ESLint 9.32.0 + `typescript-eslint` 8.38.0 (`eslint.config.js`, flat config) - linting, with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`; note `@typescript-eslint/no-unused-vars` is explicitly turned off
- PostCSS 8.5.6 + Autoprefixer 10.4.21 - CSS processing pipeline for Tailwind

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.105.1 - primary database/backend client (`src/integrations/supabase/client.ts`); used for all data (profiles, plans, billing, trainers, societies, etc.) under an **anon/publishable key with open RLS** (see INTEGRATIONS.md and CONCERNS)
- `firebase` 12.16.0 - trainer authentication only (email/password, Google sign-in, email-link) via `src/integrations/firebase/client.ts` and `src/contexts/AuthContext.tsx`
- `date-fns` 3.6.0 - date math for session/plan scheduling logic (`src/lib/dates.ts`, `src/lib/sessionPlan.ts`, `src/lib/trainerSessions.ts`)
- `zod` 3.25.76 - runtime schema validation paired with React Hook Form
- `sonner` 1.7.4 - toast notifications app-wide

**Infrastructure:**
- `recharts` 2.15.4 - charts (admin/trainer dashboards, earnings/plan visualizations)
- `embla-carousel-react` 8.6.0 - carousels on marketing pages
- `cmdk` 1.1.1 - command palette component
- `react-day-picker` 8.10.1 - calendar/date-picker UI (booking, plans, off-times)
- `input-otp` 1.4.2 - present as a dependency but the app's actual auth flow does NOT use numeric OTP (per architecture memory: link-based Firebase auth only) — likely a leftover from the shadcn/ui scaffold
- `vaul` 0.9.9 - drawer component primitive
- `next-themes` 0.3.0 - theme (light/dark) switching support, present though app appears primarily single-themed

## Configuration

**Environment:**
- `.env` file present at repo root (gitignored: `.gitignore` excludes `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.staging`) — contains only public/publishable keys, no server secrets
- Required Vite env vars (names only, values never read): `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- Vercel deployment also has `VITE_FIREBASE_*` env vars configured (per project memory)
- A custom prebuild step, `scripts/generate-booking-config.js`, reads `process.env`/`.env` at dev/build time and writes a gitignored `public/booking-config.js` (`window.FVConfig = { url, key }`) so the static, non-bundled `public/booking-modal.js` (used on plain HTML SEO pages) can call the Supabase REST API directly via `fetch()` without a bundler or SDK

**Build:**
- `vite.config.ts` — path alias `@` → `./src`; custom middleware plugins for (a) clean-URL rewriting of static SEO HTML pages (`CLEAN_URL_MAP`, e.g. `/personal-training` → `personal-training.html`) and (b) serving the embedded `public/societies` static export at `/societies/*` in dev/preview (production serving is handled by `vercel.json` rewrites instead)
- `vercel.json` — `cleanUrls: true`; SPA fallback rewrite `"/((?!societies)(?!.*\\.html$).*)" → "/"` deliberately excludes `/societies*` and `*.html` paths so the static sub-app and static SEO pages bypass the SPA catch-all; permanent redirects map legacy `.html` URLs to clean URLs
- `tailwind.config.ts` — Tailwind theme/tokens config
- `components.json` — shadcn/ui config (style: default, baseColor: slate, path aliases matching `tsconfig`)

## Platform Requirements

**Development:**
- Node.js + npm (or Bun) to run Vite dev server (`npm run dev`, port 8080 per `vite.config.ts` `server.host/port`)
- `npm run dev` / `npm run build` both run `node scripts/generate-booking-config.js` first (prebuild step)

**Production:**
- Deployment target: Vercel (evidenced by `vercel.json` config, redirects/rewrites tuned for Vercel's routing model, and prior commit `fix(build): read process.env and fallback gracefully in generate-booking-config to prevent Vercel build failures`)
- Static SPA build output served by Vercel; no custom Node server required at runtime

## Embedded Sub-App: "Society Poles" (Next.js polls micro-site)

Source lives **outside this repository** at `/Users/harshsaini/Desktop/New project/Society Poles` (its own git repo). Its static export is committed here at `public/societies/` and served at `/societies/*`.

**Stack (from its own `package.json`):**
- Next.js 16.2.11 (App Router), React 19.2.4 / React DOM 19.2.4 — a newer, incompatible React major version than the root app's React 18; kept fully isolated since it never enters the root app's bundle
- TypeScript 5, Tailwind CSS 4 (`@tailwindcss/postcss`)
- `@supabase/supabase-js` 2.110.8 — its own Supabase client, now pointed at the **same** main FitVed Supabase project (`eoexvygolxoygoqfrjzc`) using `poll_`-prefixed tables (`poll_societies`, `poll_slots`, `poll_responses`, `poll_area_requests`)
- `framer-motion`, `canvas-confetti`, `recharts` 3, `xlsx`, `react-hook-form` 7 + `zod` 4 (major-version-newer than root app's zod 3)
- Build config: `next.config.ts` sets `output: "export"`, `basePath: "/societies"`, `trailingSlash: true`, `images.unoptimized: true`

**Integration mechanism:**
- `scripts/build-societies.sh` (in this repo) runs `npm run build` inside the external polls project directory, copies its `out/` to this repo's `public/societies/`, then flattens `public/societies/societies/*.jpg` up one directory level
- To update the embedded sub-app: edit the external project, then re-run `scripts/build-societies.sh` and commit the regenerated `public/societies/`

---

*Stack analysis: 2026-07-30*
