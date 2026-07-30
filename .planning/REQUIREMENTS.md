# Requirements: FitVed — Find Trainers System

**Defined:** 2026-07-30
**Core Value:** A visitor can find a verified FitVed trainer matching their needs and land on a premium profile that drives a free-trial booking.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases. All UI must reuse the existing FitVed design system (fv-navy #1E3A5F, fv-orange #FF6B35, Fraunces + Outfit, existing shadcn cards/buttons/shadows/radii) — no redesign, no "Send Message", no "AC Assured".

### Data & Migration

- [ ] **DATA-01**: Additive migration adds new `trainers` columns via `ADD COLUMN IF NOT EXISTS` — `gender`, `languages text[]`, `city`, `headline`, `about` (long), `availability_online boolean`, `availability_offline boolean`, `instagram`, `linkedin`, `youtube`, `website`, `facebook`, `slug`
- [ ] **DATA-02**: New `trainer_media` table (`id`, `trainer_id`, `kind` [image|video|reel|transformation], `path/url`, `caption`, `sort_order`, `created_at`) with open-RLS policy, created `IF NOT EXISTS`
- [ ] **DATA-03**: New `trainer_testimonials` table (`id`, `trainer_id`, `client_name` NOT NULL, `client_image`, `transformation_image`, `before_image`, `after_image`, `rating`, `review`, `video_url`, `created_at`) with open-RLS policy, created `IF NOT EXISTS`
- [ ] **DATA-04**: Media & testimonial files stored in the existing `trainer-assets` bucket under new folders; nothing destructive; UI degrades gracefully with a "run migration" banner until the user runs the SQL
- [ ] **DATA-05**: Each trainer gets a unique, name-derived `slug` (de-duped) used for public profile URLs
- [ ] **DATA-06**: Book-Trial lead capture writes via an anon-insertable path and records `preferred_trainer` attribution (mirror the working open-policy pattern, not the restrictive `leads` RLS that currently blocks anon inserts)

### Profile Builder (extend existing trainer dashboard — no redesign)

- [ ] **BUILD-01**: Trainer can edit personal details — photo, name, education, experience, clients trained, short bio, long about
- [ ] **BUILD-02**: Trainer can set Availability as Online and/or Offline-Home Visit checkboxes (both allowed) — replaces "training mode"; powers listing filters
- [ ] **BUILD-03**: Trainer can pick a Primary City from a top-Indian-cities dropdown
- [ ] **BUILD-04**: After picking a city, trainer can multi-select Areas Served from that city's popular localities, stored as an array (searchable)
- [ ] **BUILD-05**: Trainer can multi-select the languages they speak
- [ ] **BUILD-06**: Trainer specializations reuse the existing shared specialization system (already becomes a filter)
- [ ] **BUILD-07**: Trainer can add social links — Instagram, LinkedIn, YouTube, Website, Facebook
- [ ] **BUILD-08**: Trainer can upload transformation photos + workout images (images, max 20)
- [ ] **BUILD-09**: Trainer can upload workout videos + reels (videos, max 10)
- [ ] **BUILD-10**: Trainer can add testimonials — client name (required) plus optional client image, transformation image, rating, review, before/after photos, video testimonial
- [ ] **BUILD-11**: Existing certificates section is retained unchanged
- [ ] **BUILD-12**: Builder uses existing FitVed dashboard styling; degrades gracefully before migration is run

### Discovery / Listing page (`/trainers`)

- [ ] **LIST-01**: Hero with title "Find Certified Personal Trainers & Yoga Coaches" and the specified subtitle, in FitVed style
- [ ] **LIST-02**: Search bar matches trainers by name, area, city, or specialization
- [ ] **LIST-03**: City filter — large dropdown of the top 10 cities (Bangalore, Mumbai, Delhi, Hyderabad, Pune, Chennai, Kolkata, Ahmedabad, Noida, Gurgaon)
- [ ] **LIST-04**: Area filter appears only after a city is selected, populated with that city's popular localities
- [ ] **LIST-05**: Availability filter — Online / Offline-Home Visit
- [ ] **LIST-06**: Experience filter — 0–2, 2–5, 5–10, 10+ years
- [ ] **LIST-07**: Gender filter — Male / Female
- [ ] **LIST-08**: Languages filter — multi-select
- [ ] **LIST-09**: Specializations filter — sourced from the existing DB specialization list (not a new hardcoded list)
- [ ] **LIST-10**: Trainer card shows photo, verified badge, name, short headline, years experience, clients trained, languages, availability, areas served, top specializations, and a **View Profile** CTA (no Send Message)
- [ ] **LIST-11**: Sort — Most Experienced / Most Popular / Newest / Alphabetical
- [ ] **LIST-12**: Pagination or Load More
- [ ] **LIST-13**: Only admin-approved (`active=true`) trainers with a complete profile appear; the verified badge denotes admin approval
- [ ] **LIST-14**: Skeleton loaders while fetching and a clear empty state when no trainers match

### Public Trainer Profile (`/trainers/:slug`)

- [ ] **PROF-01**: Premium profile page auto-generated from the trainer's dashboard data at a name-slug URL
- [ ] **PROF-02**: Hero — large photo, verified badge, headline, years experience, clients trained, availability, languages; primary CTA Book Trial + secondary CTA View Programs
- [ ] **PROF-03**: About + Stats sections
- [ ] **PROF-04**: Specializations section
- [ ] **PROF-05**: Areas Served grouped by city
- [ ] **PROF-06**: Languages section
- [ ] **PROF-07**: Gallery — images grid
- [ ] **PROF-08**: Transformation gallery
- [ ] **PROF-09**: Workout videos — playable inline
- [ ] **PROF-10**: Testimonials — beautiful cards supporting images, video, rating, before/after
- [ ] **PROF-11**: Certificates section
- [ ] **PROF-12**: Social media icon buttons — Instagram, LinkedIn, YouTube, Website
- [ ] **PROF-13**: Bottom CTA "Ready to start training? Book your FREE trial" reusing the existing FitVed trial modal; the captured lead tags the source trainer
- [ ] **PROF-14**: SEO-friendly per-trainer metadata (title/description/canonical)

### Navigation & Routing

- [ ] **NAV-01**: Navbar "Trainers" opens the `/trainers` listing (desktop + mobile), replacing the current scroll link
- [ ] **NAV-02**: Listing → profile routing wired via react-router (View Profile → `/trainers/:slug`)

### Cross-cutting UX

- [ ] **UX-01**: Everything is fully responsive (mobile → desktop)
- [ ] **UX-02**: Accessible — labels, keyboard nav, alt text, focus states
- [ ] **UX-03**: Subtle animations only; no lorem ipsum anywhere
- [ ] **UX-04**: Reuse FitVed design tokens and existing components throughout

## v2 Requirements

Deferred; tracked but not in the current roadmap.

### Enhancements

- **V2-01**: Map/geolocation "near me" trainer search
- **V2-02**: Trainer availability calendar / real scheduling
- **V2-03**: Client-side reviews (visitors rate trainers) with moderation
- **V2-04**: Trainer analytics (profile views, lead conversion) dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| "Send Message" / trainer DM | User explicitly excludes it; conversion is via Book Trial only |
| "AC Assured" badge/filter | Reference-site artifact, not part of FitVed |
| Redesign of the existing FitVed site | Must keep the current design system verbatim |
| Copying reference-site UI | References are for functionality only; use FitVed's visual language |
| Payments / booking checkout | Trial booking reuses the existing lead modal, no payment/calendar system |
| Regenerating a real test suite | Repo has no meaningful tests; out of scope for this feature |

## Traceability

Mapped during roadmap creation (2026-07-30). Every v1 requirement maps to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 — Data Foundation & Safe Migration | Pending |
| DATA-02 | Phase 1 — Data Foundation & Safe Migration | Pending |
| DATA-03 | Phase 1 — Data Foundation & Safe Migration | Pending |
| DATA-04 | Phase 1 — Data Foundation & Safe Migration | Pending |
| DATA-05 | Phase 1 — Data Foundation & Safe Migration | Pending |
| DATA-06 | Phase 1 — Data Foundation & Safe Migration | Pending |
| BUILD-01 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-02 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-03 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-04 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-05 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-06 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-07 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-08 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-09 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-10 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-11 | Phase 2 — Trainer Profile Builder | Pending |
| BUILD-12 | Phase 2 — Trainer Profile Builder | Pending |
| PROF-01 | Phase 3 — Public Trainer Profile | Pending |
| PROF-02 | Phase 3 — Public Trainer Profile | Pending |
| PROF-03 | Phase 3 — Public Trainer Profile | Pending |
| PROF-04 | Phase 3 — Public Trainer Profile | Pending |
| PROF-05 | Phase 3 — Public Trainer Profile | Pending |
| PROF-06 | Phase 3 — Public Trainer Profile | Pending |
| PROF-07 | Phase 3 — Public Trainer Profile | Pending |
| PROF-08 | Phase 3 — Public Trainer Profile | Pending |
| PROF-09 | Phase 3 — Public Trainer Profile | Pending |
| PROF-10 | Phase 3 — Public Trainer Profile | Pending |
| PROF-11 | Phase 3 — Public Trainer Profile | Pending |
| PROF-12 | Phase 3 — Public Trainer Profile | Pending |
| PROF-13 | Phase 3 — Public Trainer Profile | Pending |
| PROF-14 | Phase 3 — Public Trainer Profile | Pending |
| LIST-01 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-02 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-03 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-04 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-05 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-06 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-07 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-08 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-09 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-10 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-11 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-12 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-13 | Phase 4 — Discovery / Listing Page | Pending |
| LIST-14 | Phase 4 — Discovery / Listing Page | Pending |
| NAV-02 | Phase 4 — Discovery / Listing Page | Pending |
| NAV-01 | Phase 5 — Navbar Wiring & Cross-cutting Polish | Pending |
| UX-01 | Phase 5 — Navbar Wiring & Cross-cutting Polish | Pending |
| UX-02 | Phase 5 — Navbar Wiring & Cross-cutting Polish | Pending |
| UX-03 | Phase 5 — Navbar Wiring & Cross-cutting Polish | Pending |
| UX-04 | Phase 5 — Navbar Wiring & Cross-cutting Polish | Pending |

**Coverage:**
- v1 requirement IDs: 52 total (DATA×6, BUILD×12, LIST×14, PROF×14, NAV×2, UX×4)
- Mapped to phases: 52 (100%)
- Unmapped: 0 ✓
- Note: the original header estimate of "48" omitted the four UX-* cross-cutting requirements; all 52 enumerated requirements are mapped to exactly one phase.

---
*Requirements defined: 2026-07-30*
*Last updated: 2026-07-30 after roadmap creation (traceability populated)*
