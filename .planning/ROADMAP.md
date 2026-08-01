# Roadmap: FitVed — Find Trainers System

## Overview

A brownfield feature addition to the existing FitVed client portal (React 18 + Vite + TS + Tailwind + shadcn + Supabase). We extend — never redesign — the current app to deliver a conversion-focused trainer directory. The journey runs in vertical slices, each shipping an end-to-end usable capability: first a safe additive data foundation (new columns/tables, slug, storage folders, anon-writable lead path), then the trainer-facing profile builder that populates that data, then the premium public profile page that proves the listing → profile → Book Trial funnel, then the discovery/listing page that feeds visitors into those profiles, and finally the navbar wiring plus cross-cutting responsive/a11y/SEO/brand polish. Every surface reuses the FitVed design system verbatim (fv-navy #1E3A5F, fv-orange #FF6B35, Fraunces + Outfit, existing shadcn primitives) and degrades gracefully until the user manually runs the SQL.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Foundation & Safe Migration** - Additive schema, slug, storage folders, and an anon-writable Book-Trial lead path
- [ ] **Phase 2: Trainer Profile Builder** - Extend the trainer dashboard so trainers can enter all new profile data
- [ ] **Phase 3: Public Trainer Profile** - Premium `/trainers/:slug` page auto-generated from dashboard data, driving Book Trial
- [ ] **Phase 4: Discovery / Listing Page** - `/trainers` search, filters, cards, sort, and pagination feeding into profiles
- [ ] **Phase 5: Navbar Wiring & Cross-cutting Polish** - Repoint the nav to `/trainers` and finish responsive/a11y/SEO/brand polish

## Phase Details

### Phase 1: Data Foundation & Safe Migration
**Goal**: The app can store and serve rich trainer profile data on a safe, additive schema, with a working anon lead-capture path and graceful degradation before the SQL is run.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. Running the additive SQL adds the new `trainers` columns and the `trainer_media` + `trainer_testimonials` tables (all `IF NOT EXISTS`) without altering or losing any existing trainer or certificate data.
  2. Media and testimonial files upload into new folders inside the existing `trainer-assets` bucket, with nothing destructive to existing assets.
  3. Each trainer has a unique, name-derived `slug` (duplicates de-duped) usable as a public profile URL path.
  4. Before the migration is run, trainer-facing and public surfaces show a clear "run migration" state instead of crashing.
  5. A Book-Trial lead can be inserted anonymously via an open-policy path and records a `preferred_trainer` attribution — not blocked by the restrictive existing `leads` RLS.
**Plans**: TBD

### Phase 2: Trainer Profile Builder
**Goal**: Trainers can enter all the new profile data — personal details, availability, location, languages, specializations, socials, media, and testimonials — from their existing FitVed dashboard.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06, BUILD-07, BUILD-08, BUILD-09, BUILD-10, BUILD-11, BUILD-12
**Success Criteria** (what must be TRUE):
  1. A trainer can fill in and save personal details — photo, name, education, experience, clients trained, short bio, and long about.
  2. A trainer can set Availability (Online and/or Offline-Home Visit), pick a primary city, multi-select areas served from that city's localities, multi-select languages, and select specializations from the existing shared list.
  3. A trainer can add social links (Instagram, LinkedIn, YouTube, Website, Facebook) and upload up to 20 images (transformations + workout photos) and up to 10 videos (workout videos + reels).
  4. A trainer can add testimonials with a required client name plus optional client image, transformation image, rating, review, before/after photos, and a video testimonial.
  5. The builder reuses existing FitVed dashboard styling, retains the certificates section unchanged, and degrades gracefully before the migration is run.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Public Trainer Profile
**Goal**: Every approved, profile-complete trainer has a premium public profile page auto-generated from their dashboard data that drives a free-trial booking.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, PROF-09, PROF-10, PROF-11, PROF-12, PROF-13, PROF-14
**Success Criteria** (what must be TRUE):
  1. Visiting `/trainers/:slug` renders a premium profile with a hero (large photo, verified badge, headline, years experience, clients trained, availability, languages) and primary Book Trial + secondary View Programs CTAs.
  2. The page presents about + stats, specializations, areas served grouped by city, languages, an image gallery, a transformation gallery, inline-playable workout videos, testimonial cards (images/video/rating/before-after), certificates, and social media icon buttons.
  3. The bottom "Ready to start training? Book your FREE trial" CTA opens the existing FitVed trial modal and tags the captured lead with the source trainer.
  4. Each profile exposes SEO-friendly per-trainer metadata (title, description, canonical).
**Plans**: TBD
**UI hint**: yes

### Phase 4: Discovery / Listing Page
**Goal**: Visitors can search, filter, sort, and browse verified FitVed trainers and click through to a profile.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, LIST-06, LIST-07, LIST-08, LIST-09, LIST-10, LIST-11, LIST-12, LIST-13, LIST-14, NAV-02
**Success Criteria** (what must be TRUE):
  1. `/trainers` shows a FitVed-styled hero ("Find Certified Personal Trainers & Yoga Coaches" + subtitle) and a search bar that matches trainers by name, area, city, or specialization.
  2. Visitors can filter by city (top 10), then by area (revealed only after a city is chosen), plus availability, experience band, gender, languages, and specializations (sourced from the existing DB list).
  3. Trainer cards show photo, verified badge, name, headline, years experience, clients trained, languages, availability, areas served, and top specializations, with a View Profile CTA (no Send Message) that routes via react-router to `/trainers/:slug`.
  4. Visitors can sort (Most Experienced / Most Popular / Newest / Alphabetical) and page through results via pagination or Load More.
  5. Only `active=true`, profile-complete trainers appear; skeleton loaders show while fetching and a clear empty state shows when no trainers match.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Navbar Wiring & Cross-cutting Polish
**Goal**: The directory is reachable from the site navigation, and the whole Find Trainers feature is responsive, accessible, SEO-friendly, and on-brand.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: NAV-01, UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. The navbar "Trainers" item (desktop + mobile) opens the `/trainers` listing instead of scrolling to the static team section.
  2. The listing and profile pages work fully across mobile → desktop breakpoints.
  3. Interactions are accessible (labels, keyboard navigation, alt text, focus states), animations are subtle only, and there is no lorem ipsum anywhere.
  4. All new surfaces reuse FitVed design tokens and existing shadcn components verbatim — no new visual language.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation & Safe Migration | 0/TBD | Not started | - |
| 2. Trainer Profile Builder | 0/TBD | Not started | - |
| 3. Public Trainer Profile | 0/TBD | Not started | - |
| 4. Discovery / Listing Page | 0/TBD | Not started | - |
| 5. Navbar Wiring & Cross-cutting Polish | 0/TBD | Not started | - |
