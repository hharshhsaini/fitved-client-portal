# Admin Dashboard — Spec

**Status:** Draft for review (spec only, no code yet)
**Route:** `/admin` (currently redirects to `/admin/customers` — this becomes the real dashboard)
**Audience:** Admin/owner. An ops-first "what needs my attention today" screen, not a vanity analytics page.

---

## 1. The idea in one line

When the admin logs in, the first screen answers two questions:
1. **How's the business doing?** → three numbers across the top.
2. **What do I need to act on right now?** → an Attention Queue of concrete to-dos, ranked by urgency.

Nothing on this screen is decorative. Every row is either a number the owner tracks or a person the owner needs to contact/fix.

---

## 2. Layout

```
┌─────────────────────────────────────────────────────────┐
│  Good morning, {admin name}                               │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Active        │  │ MRR           │  │ Collected     │   │
│  │ clients       │  │ (normalized)  │  │ this month    │   │
│  │    142        │  │  ₹2,84,000    │  │  ₹1,96,500    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                           │
│  ATTENTION QUEUE                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ⚠ Renewals due (7)                                │    │
│  │    rows…                                          │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ ◷ Onboarding gaps (3)                             │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ ↩ Currently paused (4)                            │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ ⊘ Trainer off-times (2)                           │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

Mobile: tiles stack 1-per-row (or 3 compact tiles in a row), Attention Queue sections stack vertically. Matches the existing Fitved card styling (navy/gold, rounded-3xl, soft shadow).

---

## 3. The three headline numbers

### A. Active clients
- **What it means:** people currently in a running program.
- **Definition:** count of distinct `plans.user_id` where `status IN ('active','paused')` AND `end_date >= today`.
  - `paused` is included on purpose — a client on a pause is still a paying client, just not attending this week.
- **Source:** `plans` table.

### B. MRR (normalized)  — the money number you chose
- **What it means:** the recurring monthly value of the active book, even though plans are sold prepaid for 1/3/6 months.
- **Definition:**
  ```
  MRR = SUM( plan.amount / months )  for every plan where status='active' and end_date >= today
  where months = GREATEST(1, ROUND( (end_date - start_date) / 30.0 ))
  ```
  - A ₹18,000 6-month plan contributes ₹3,000/mo. A ₹3,500 1-month plan contributes ₹3,500/mo.
  - `months` is derived from the date range because there is **no `plan_type` column** on the plans table (the enum exists but isn't stored). If you'd rather store the term explicitly, that's a small migration — noted in §7.
- **Source:** `plans` table.

### C. Collected this month  (fills the slot vacated by "coverage")
- **What it means:** actual cash received this calendar month.
- **Definition:** `SUM(billing_history.amount)` where `payment_date` is within the current month.
- **Source:** `billing_history`.
- **Swap candidates** if you prefer a different third number later: "New clients this month", "Plans expiring in 30 days (₹ at risk)".

---

## 4. Attention Queue (the to-do list)

Ordered most-urgent first. Each section shows a count badge and collapses if empty. Each row has quick actions where it makes sense (call / WhatsApp / open profile).

### 4.1 Renewals due  ⚠  (highest priority)
- **Who:** active plans ending soon.
- **Query:** `plans` where `status='active'` AND `end_date BETWEEN today AND today + 14 days` (window configurable; default 14).
- **Split into two visual groups:**
  - **Will lapse** (`auto_renew = false`) — these need a phone call. Show first, in amber/red.
  - **Auto-renews** (`auto_renew = true`) — lower urgency; show "renews on {renewal_date}", just confirm payment goes through.
- **Row shows:** client name · society · ends in N days (date) · plan amount · call + WhatsApp buttons · link to profile.
- **Why:** churn happens at renewal. This is the single most valuable list on the page.

### 4.2 Onboarding gaps  ◷
- **Who:** clients who signed up but aren't fully set up — they'll fall through the cracks.
- **Query:** profiles whose role is `client` AND missing any of:
  - no active plan (no row in `plans` for that user), OR
  - `trainer_id IS NULL`, OR
  - `society_id IS NULL`.
- **Row shows:** name · phone · chips for what's missing (`No plan` / `No trainer` / `No society`) · open profile to fix.
- **Why:** a signed-up person with no plan/trainer/society is lost revenue sitting in the database.

### 4.3 Currently paused  ↩
- **Who:** every client on an active pause right now.
- **Query:** `pauses` where `status='active'` AND `to_date >= today` (the pause hasn't ended yet).
- **Row shows:** client name · society · time slot · pause range (from → to) · resumes on {to_date}.
- **Why:** the admin sees the full set of who's off the mat and when each returns — coverage awareness plus retention.

### 4.4 Trainer off-times  ⊘
- **Who:** trainers who are or will be unavailable.
- **Query:** `trainer_off_times` where `to_date >= today` (same data already shown on the Trainers page — mirror a compact version here).
- **Row shows:** trainer name · date range · slot (or "all slots") · reason · "Off now" / "Upcoming" badge.
- **Why:** off-times are coverage risk; surfacing them on the home screen is the lightweight stand-in for the dropped "coverage" metric.

---

## 5. Explicitly NOT in v1

- **Coverage today / coverage gaps** — dropped per decision. Needs a real batch/slot model to be trustworthy (time_slot is free text). Off-times card (4.4) is the partial stand-in.
- **Leads / conversion funnel** — the `leads` table has no status column, so there's no real funnel to show. Excluded by earlier decision.
- **Per-trainer performance, attendance, charts/graphs** — out of scope; this is an ops screen, not analytics.

---

## 6. How it's built (technical notes for build phase)

- **Single RPC recommended:** add a `get_admin_dashboard()` SECURITY DEFINER function that returns one JSON payload (the 3 numbers + each queue list). Keeps the React side to one query, avoids N+1, and centralizes the date math. Guard it with `has_role(auth.uid(),'admin')` and `REVOKE ... FROM anon`.
  - Alternative: do it client-side with a handful of TanStack Query calls against existing admin RLS policies. Simpler to start, but more round-trips and the MRR math lives in JS.
- **RLS:** admin already has read access to `plans`, `profiles`, `pauses`, `billing_history`, `trainer_off_times` (confirm during build). The RPC route sidesteps this entirely.
- **Date math:** all date comparisons use local (IST) dates, not `toISOString()` — same timezone rule we've been fixing throughout the app. If done in SQL, use the DB date type directly (no TZ shift).
- **Nav:** add "Dashboard" as the first item in the admin nav; change `/admin` from a redirect into the dashboard page (`src/pages/admin/Dashboard.tsx`). Keep Customers / Trainers / Societies.
- **Empty states:** each queue section hides or shows a calm "All clear" when its count is 0.

---

## 7. Open items / future

- **Store plan term explicitly?** Adding a `term_months` (or using the existing `plan_type` enum) column to `plans` would make MRR exact instead of date-derived. Small migration. Decide later.
- **Batches table** (parked, "Path B"): admin-controlled batches = society + slot + assigned trainer; customers never set time. Once it exists, a real **Coverage today** number can return as a 4th tile or a queue section ("uncovered slots today").
- **Renewal window** (14 days) and **resume window** (7 days) could become admin settings.

---

## 8. Build order (when approved)

1. `get_admin_dashboard()` RPC (or the client-side queries) — the 3 numbers first.
2. Top stat tiles wired to real data.
3. Attention Queue sections in priority order: Renewals → Onboarding gaps → Resuming → Off-times.
4. Quick actions (call/WhatsApp/open profile) on rows.
5. Nav + route swap (`/admin` → dashboard).
