# FitVed — Find Trainers System

## What This Is

A "Find Trainers" discovery and marketplace experience bolted onto the existing **FitVed** client portal (React 18 + Vite + TypeScript + Tailwind + shadcn/ui, Supabase backend). It lets prospective clients browse, filter, and view rich public profiles of FitVed's certified personal trainers & yoga coaches, and lets trainers build those profiles from their existing dashboard. It replaces the current navbar "Trainers" link (which scrolls to a static team section) with a real, conversion-focused trainer directory. It must look and feel like it was always part of FitVed — same navy/orange branding, typography, buttons, cards, spacing, shadows, and radii. No redesign of the existing site.

## Core Value

A visitor can find a credible, verified FitVed trainer that matches their needs (location, availability, specialization) and land on a premium profile that drives them to **book a free trial**. If everything else fails, the listing → profile → Book Trial funnel must work.

## Requirements

### Validated

<!-- Existing capabilities inferred from the mapped codebase — already shipped & relied upon. -->

- ✓ Trainer dashboard + self-service profile form (`src/components/trainer/TrainerProfileForm.tsx`) — photo, education, years_experience, clients_trained, social_link, service_areas[], specializations[], bio, CV, certificates — existing
- ✓ `trainers` table + `trainer_certificates` table + `trainer-assets` public storage bucket — existing
- ✓ Shared specialization list (`src/lib/specializations.ts`) used by trainer profile AND admin (`src/pages/admin/Trainers.tsx`) — existing
- ✓ Admin trainer management: add/edit/approve (`active` flag), Review dialog, society assignment — existing
- ✓ FitVed design system: `fv-navy` (#1E3A5F) + `fv-orange` (#FF6B35 per tailwind.config.ts), Fraunces (display) + Outfit (sans), shadcn/ui primitives — existing
- ✓ "Book your FREE trial" modal on the landing page (triggered via `open_consult_modal` window event; writes to `leads` table) — existing
- ✓ React Router SPA routing (`src/App.tsx`), TanStack React Query data layer, Supabase anon-key client with open RLS — existing

### Active

<!-- The Find Trainers system — hypotheses until shipped & validated. -->

**Part 1 — Trainer Discovery / Listing page (`/trainers`)**
- [ ] Hero (title "Find Certified Personal Trainers & Yoga Coaches" + subtitle) in FitVed style
- [ ] Search bar: match trainers by name, area, city, or specialization
- [ ] City filter (large dropdown, top 10 Indian cities) → Area filter appears only after a city is chosen (per-city popular localities)
- [ ] Availability filter (Online / Offline-Home Visit)
- [ ] Experience filter (0–2, 2–5, 5–10, 10+ years)
- [ ] Gender filter (Male / Female)
- [ ] Languages filter (multi-select)
- [ ] Specializations filter (sourced from the existing DB specialization list — not hardcoded anew)
- [ ] Trainer cards: photo, verified badge, name, short headline, years experience, clients trained, languages, availability, areas served, top specializations, **View Profile** CTA (no Send Message)
- [ ] Sort: Most Experienced / Most Popular / Newest / Alphabetical
- [ ] Pagination / Load More
- [ ] Only admin-approved (`active=true`) trainers with a **complete** profile appear; verified badge = admin-approved
- [ ] Skeleton loaders, empty states, responsive, accessible, SEO-friendly, subtle animations

**Part 2 — Trainer Profile Builder (extend existing dashboard, do not redesign)**
- [ ] Personal details: photo, name, education, experience, clients trained, short bio, long about
- [ ] Availability: Online / Offline-Home Visit checkboxes (both allowed) — replaces "training mode"; powers filters
- [ ] Primary City dropdown → Areas Served multi-select (popular localities), stored as array — searchable
- [ ] Languages multi-select
- [ ] Specializations — reuse existing system (already becomes a filter)
- [ ] Social links: Instagram, LinkedIn, YouTube, Website, Facebook
- [ ] Media uploads: transformation photos + workout images + workout videos + reels (max 20 images, 10 videos)
- [ ] Testimonials section: client name (required) + optional client image, transformation image, rating, review, before/after photos, video testimonial
- [ ] Certificates — keep existing

**Part 3 — Public Trainer Profile (`/trainers/:slug`, auto-generated from dashboard)**
- [ ] Premium landing page: hero (large photo, verified badge, headline, years exp, clients trained, availability, languages, Book Trial + View Programs CTAs), about, stats, specializations, areas served grouped by city, languages, gallery (images grid), transformation gallery, workout videos (playable inline), testimonials (images/video/rating/before-after), certificates, social media icon buttons
- [ ] Bottom CTA "Ready to start training? Book your FREE trial" reusing the existing FitVed trial modal; captured lead tags the source trainer (`preferred_trainer`)
- [ ] Name-based unique slug per trainer; responsive, accessible, SEO-friendly

**Data**
- [ ] Additive, safe migration (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS): new `trainers` columns (gender, languages[], primary city, areas served already exists as service_areas[], headline, long about/about, availability_online, availability_offline, instagram/linkedin/youtube/website/facebook, slug) + new tables `trainer_media`, `trainer_testimonials` + new storage folders in existing `trainer-assets` bucket. No data loss. UI degrades gracefully until the user runs the SQL.

### Out of Scope

- **"AC Assured" badge/filter** — explicitly removed (reference-site artifact, not FitVed)
- **"Send Message" button / trainer DM** anywhere — user does not want direct messaging; conversion is via Book Trial only
- **Redesign of the existing FitVed site** — keep the current design system verbatim
- **Copying the reference sites' UI** — reference images are for functionality only; use FitVed's visual language
- **Payments / booking scheduling** — trial booking uses the existing lead modal, not a new payment or calendar system

## Context

- **Brownfield**: full codebase map in `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS).
- **Data layer**: Supabase (project `eoexvygolxoygoqfrjzc`) via the anon/publishable key with **open RLS**; DDL is run manually by the user in the SQL editor (the app cannot run migrations). Generated Supabase types lag behind live migrations, so `supabase as any` casts are an accepted pattern for new columns/tables.
- **Auth**: split — custom localStorage auth (customers/admins) + Firebase Auth for trainer credentials. The public listing/profile pages are unauthenticated (read-only).
- **Design tokens**: `fv-navy` #1E3A5F, `fv-orange` #FF6B35 (tailwind.config.ts), Fraunces + Outfit fonts, existing shadcn/ui components, established card/shadow/radius patterns.
- **Existing trainer data** already carries `specializations[]`, `service_areas[]`, `photo_path`, `cv_path`, `bio`, `education`, `years_experience`, `clients_trained`, `social_link`, `active`, plus `trainer_certificates`. The Find Trainers system reuses these and extends them.
- **Known concerns** (from CONCERNS.md) to respect: open RLS, migration drift, large monolith files (Landing.tsx 2,671 lines etc.), no real test suite, `leads` table RLS drift that can break lead inserts — the Book-Trial path must use a policy that actually accepts anon inserts (mirror the working `poll_area_requests`/`trainer-assets` open-policy pattern rather than the restrictive `leads` policy).

## Constraints

- **Tech stack**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + TanStack React Query + Supabase. No new frameworks.
- **Design**: Must reuse the existing FitVed design system exactly — no redesign, no new visual language.
- **Compatibility**: Must not break existing trainer dashboard, admin trainers, auth, or the societies sub-site.
- **Migrations**: Additive only, `IF NOT EXISTS`, no data loss; user runs the SQL; features degrade gracefully until then.
- **Security**: Anon-key + open-RLS reality — public pages are read-only; lead capture must use an anon-writable policy.
- **UX**: Responsive, accessible, SEO-friendly, skeleton loaders, empty states, subtle animations, no lorem ipsum, no Send Message.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Listing shows only `active=true` + profile-complete trainers; verified badge = admin-approved | Avoid half-empty cards; verification is meaningful | — Pending |
| Public routes `/trainers` (listing) + `/trainers/:slug` (name-slug profile) | Pretty, SEO-friendly URLs; add unique slug column with de-dupe | — Pending |
| Additive migration + 2 new tables (`trainer_media`, `trainer_testimonials`), reuse `trainer-assets` bucket; user runs SQL | Only add what's necessary; safe; matches established workflow | — Pending |
| Book-Trial reuses existing FitVed trial modal and tags the source trainer (`preferred_trainer` on the lead) | Native UX + attribution so admin can route the lead | — Pending |
| Replace navbar "Trainers" scroll link with the `/trainers` listing route | User asked to repurpose the existing nav item | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-30 after initialization*
