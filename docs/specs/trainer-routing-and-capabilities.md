# Spec: Trainer Routing & Trainer Capabilities

**Status:** Draft for review
**Date:** 2026-06-10
**Owner:** Vishal

---

## 1. Problem

Trainer support was bolted onto a client-first app. Current issues:

| # | Issue | Where |
|---|-------|-------|
| 1 | **Role loads after auth.** `loading=false` fires before `fetchRole()` resolves → trainer sees a flash of the client dashboard before being bounced. | `AuthContext.tsx` |
| 2 | **Routing by side-effect.** The trainer redirect is a render-time `<Navigate>` inside `Dashboard.tsx` — the page decides routing, not the router. | `Dashboard.tsx` |
| 3 | **Client routes not blocked.** A trainer can type `/plan`, `/pause`, `/health` and land on pages querying data they don't have (empty/broken UI). Nav hides links but routes don't guard. | `App.tsx` |
| 4 | **Trainer route not blocked for clients.** A client typing `/trainer` gets an empty trainer dashboard instead of a redirect. | `App.tsx` |
| 5 | **Login always navigates to `/dashboard`** regardless of role — an extra redirect hop for trainers. | `Login.tsx` |
| 6 | **Orphan trainer role.** A user can hold the `trainer` role with no matching `trainers` row (or `active=false`) → empty dashboard, no explanation. | data |
| 7 | **🔴 Security: trainers can read client DOB.** The client's DOB **is their password**. If RLS lets trainers select assigned clients' `profiles` rows, nothing restricts columns — a trainer hitting the API directly can read `dob` and log in as any of their clients. | RLS |

---

## 2. Routing design

### 2.1 Single source of truth: `homeForRole()`

```ts
// src/lib/routes.ts
export function homeForRole(role: AppRole | null): string {
  switch (role) {
    case "trainer": return "/trainer";
    case "admin":   return "/dashboard";   // admin keeps client view + admin nav
    default:        return "/dashboard";   // client
  }
}
```

Used by: Login success, `/` and `/index` redirects, all guard fallbacks. No page component ever decides routing again.

### 2.2 Fix the role race

`AuthContext` must not report ready until **both** session *and* role are resolved:

- Add `roleLoading` state; `fetchRole` sets it false when done.
- `ProtectedRoute` waits on `loading || (user && roleLoading)` before rendering anything.
- Result: guards always see the real role. No flash, ever.

### 2.3 Route guard: `RoleRoute`

Replace the boolean `requireAdmin` with a roles allowlist:

```tsx
<RoleRoute allow={["client", "admin"]}> ... </RoleRoute>
<RoleRoute allow={["trainer"]}> ... </RoleRoute>
<RoleRoute allow={["admin"]}> ... </RoleRoute>
```

Behavior: not signed in → `/login`. Signed in but role not allowed → `homeForRole(role)` (not an error page — silent redirect).

### 2.4 Route table

| Route | client | trainer | admin | Notes |
|---|---|---|---|---|
| `/dashboard` | ✅ | ⛔→/trainer | ✅ | remove the in-component Navigate |
| `/plan` `/health` `/pause` | ✅ | ⛔→/trainer | ✅ | currently unguarded — fix |
| `/profile` | ✅ | ✅ | ✅ | shared; renders trainer variant (see 3.4) |
| `/trainer` | ⛔→/dashboard | ✅ | ✅ (view-as) | currently unguarded — fix |
| `/admin/*` | ⛔ | ⛔ | ✅ | unchanged |
| `/login` | redirect to home if already signed in | same | same | avoids dead-end |

### 2.5 Trainer account states (edge cases)

Resolved in order, on entry to `/trainer`:

| State | Detection | Behavior |
|---|---|---|
| **Healthy** | `trainers` row exists, `active=true` | Normal dashboard |
| **Orphan role** | role=trainer, no `trainers` row | Full-screen "Account setup pending — contact your admin" card. No broken empty dashboard. (Mostly prevented already by auto-create-on-grant, but old grants may predate it.) |
| **Deactivated** | `trainers.active = false` | Full-screen "Your trainer account is inactive" + sign-out button. Deactivating in admin must actually lock the person out, not just hide them from lists. |
| **No societies** | healthy but 0 `trainer_societies` links | Existing empty state (keep) |
| **Dual role (client+trainer)** | both rows in `user_roles` | Trainer wins (current behavior). A view switcher is **out of scope** — revisit only if a real person needs both. |

---

## 3. Trainer capabilities

### Principle
The trainer app answers one question: **"What does my day look like, and who do I need to know about?"** Everything ships in service of that. Trainers are *not* mini-admins.

### 3.1 Phase 1 — exists today (polish only)

- ✅ Societies list with batch chips + client counts
- ✅ Society → client roster drill-down, grouped by slot
- ✅ Off-time: full-day range or single slot, with reason; delete upcoming
- ✅ Client pause visibility (`TrainerPauses` via RPC)
- Polish: roster phone numbers become tap-to-call / WhatsApp deep links (`tel:`, `wa.me/91...`) — trainers live on their phones.

### 3.2 Phase 2 — "Today" view (the daily driver)

New default landing section on `/trainer`:

- **Today's batches**: each society+slot the trainer covers today, with expected headcount = roster − currently-paused clients.
- **Paused today / Resuming today**: name chips per batch, so the trainer isn't surprised by absences or returns.
- **Off-time awareness**: if trainer has off-time today, the affected batches render greyed with an "You're off" badge.
- Data: all computable from existing tables (`profiles`, `pauses`, `trainer_off_times`, `trainer_societies`). Precision improves once the `batches` table lands (separate spec — admin dashboard brainstorm).

### 3.3 Phase 3 — attendance (flagged, not committed)

Mark attendance per batch per day. High value (turns `plans.total_sessions` into real consumption data, feeds admin dashboard + renewal conversations) but a real feature: new table, backfill questions, UX for missed days. **Decide after Phase 2 ships.**

### 3.4 Trainer profile variant

`/profile` for trainers currently shows client fields (society, time slot, "your trainer"). Replace with: name, contact, specialization, assigned societies (read-only), sign out. Edit limited to contact info; specialization is admin-controlled.

### 3.5 What trainers must NOT see

| Data | Why |
|---|---|
| **Client DOB** | It's the client's password. See §4. |
| Plan price / payment / auto-renew | Commercial data, admin-only |
| Leads | Sales data |
| Health reports | Default deny. Revisit with explicit client consent flow if trainers ever need them. |
| Other trainers' rosters/off-times | Each trainer sees only their own |

---

## 4. 🔴 Security: client-data exposure via RLS

**Threat:** RLS is row-level, not column-level. Any policy granting trainers `SELECT` on assigned clients' `profiles` rows exposes **every column**, including `dob` — which is the client's login password. A trainer with their own JWT can bypass the app UI and query the REST API directly.

**Fix (do first, before any new trainer features):**

1. **Audit** existing `profiles` SELECT policies for trainer access paths.
2. Replace direct `profiles` reads in `TrainerDashboard` with a **`SECURITY DEFINER` RPC** `get_my_clients()` returning only safe columns: `id, name, phone, society_id, time_slot`. (Same pattern as the existing `get_trainer_client_pauses()`.)
3. Ensure **no RLS policy** grants trainers row access to `profiles` — all trainer reads of client data flow through column-safe RPCs.
4. Verify trainers cannot read `plans` (price) — audit policies there too.

---

## 5. Build order

| Step | Scope | Size |
|---|---|---|
| 1 | §4 security fix: `get_my_clients()` RPC + policy audit | S — **do first** |
| 2 | §2 routing: `homeForRole`, `roleLoading`, `RoleRoute`, route table, login redirect | M |
| 3 | §2.5 account states: orphan / deactivated screens | S |
| 4 | §3.4 trainer profile variant + §3.1 call/WhatsApp links | S |
| 5 | §3.2 Today view | M |
| 6 | §3.3 attendance | — decide later |

Steps 1–4 are one coherent release: "trainer login is correct, safe, and dead-ends are gone." Step 5 is the release that makes trainers *want* to open the app.

---

## 6. Open questions

1. Should the admin be able to **impersonate / preview** a trainer's view? (Useful for support; small lift since admin already passes the `/trainer` guard.)
2. When a trainer logs an off-time, should the **admin get notified** (today: only visible if admin looks)? Ties into the admin-dashboard Attention Queue spec.
3. Do trainers need to see client **plan end dates** (e.g. to nudge renewals in person), or is that strictly admin? Leaning admin-only for now.
