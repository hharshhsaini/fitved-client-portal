# Fitved — Clean Wellness Dashboard (UI-only)

A calm, premium fitness-service UI for clients aged 35–55, plus a simple mock admin view. Built with React + Vite + Tailwind + shadcn/ui (Lovable's stack — equivalent to the Next.js/Tailwind setup you described). All data is mocked in-memory; nothing persists across refresh.

## Brand & visual style

- Palette: white / light grey backgrounds, muted sage-green primary, soft slate-blue accent, gentle shadows, generous spacing, rounded-2xl cards.
- Typography: large, readable (16–18px base), comfortable for 35–55 age group.
- Tone: warm, trustworthy, uncluttered. No dense data tables on the client side.
- Fully mobile responsive (sidebar collapses to a hamburger on small screens).

## Screens

### 1. Login / Signup
- Split layout: left = soft brand panel with "Fitved" wordmark + tagline ("Calm strength. Every day."); right = form.
- Email + password fields, "Sign in" / "Create account" toggle, forgot-password link (visual only).
- Mock auth: any email/password works. Demo helper buttons: **Continue as Client** and **Continue as Admin** so you can preview both views instantly.

### 2. App shell (after login)
- Left sidebar (collapsible to icon-only) with: Dashboard, Pause Classes, Plan, Health Report, Profile. Admin users see an extra "Admin" item.
- Top bar: sidebar toggle, greeting "Hi Priya 👋", small notification bell, avatar menu (logout).

### 3. Client Dashboard (/)
Greeting + overview grid of cards:
- **Next session notification** banner — "Your next session is tomorrow at 7:30 AM with Coach Arjun."
- **Plan summary card** — plan type, start date, next payment due, days remaining (progress bar).
- **Pause status card** — "Active" or "Paused until 12 May" with quick link to manage.
- **Health report card** — last updated date + Download button.
- **Profile snapshot card** — society, time slot, trainer.

### 4. Pause Classes (/pause)
- Calendar date-range picker (shadcn Calendar with `pointer-events-auto`).
- Summary line: "You're pausing X days."
- Primary button: **Pause My Classes** → success toast, status card updates.
- Current pause status panel with **Resume Now** option if a pause is active.
- Past pauses list (mock, 2–3 entries).

### 5. Plan Details (/plan)
Large card showing: plan type badge (1 / 3 / 6 month), start date, next payment due, amount, payment method (mock), renewal toggle. Secondary card: billing history (3 mock rows).

### 6. Health Report (/health)
- Hero card: "Latest report — updated 18 Apr 2026" + **Download Latest Report (PDF)** button (downloads a generated mock PDF blob).
- List of previous reports (date + download icon).

### 7. Profile (/profile)
Read-only profile card: name, email, phone, society name, time slot, assigned trainer (with small avatar + specialty). Edit button opens a dialog (mock save → toast).

### 8. Admin view (/admin) — mock only
Simple table of clients (name, plan, trainer, status). Click a row → side panel to edit plan, assign trainer, upload report (file picker is visual only). Clear "Mock data — changes reset on refresh" notice at top.

## Navigation & state

```text
/login                → Login screen
/                     → Dashboard
/pause /plan /health /profile  → Client sections
/admin                → Admin (only if role = admin)
```

- Auth + role kept in a lightweight React context (in-memory). Refresh returns to /login.
- Mock data lives in `src/lib/mockData.ts` (user, plan, pauses, reports, trainers, clients).

## Technical notes

- Stack: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + react-router-dom (Lovable's standard; functionally matches the Next.js/Tailwind brief).
- Design tokens defined as HSL CSS variables in `index.css` and mapped in `tailwind.config.ts` (sage primary, slate accent, soft surfaces). No hardcoded colors in components.
- Components: `AppSidebar`, `TopBar`, `AuthContext`, `ProtectedRoute`, `RoleRoute`, plus one component per card (PlanCard, PauseCard, HealthCard, ProfileCard, NotificationBanner).
- PDF download uses a generated Blob so the button actually downloads a small placeholder file.
- Sidebar follows the shadcn sidebar pattern with `collapsible="icon"` and a persistent trigger in the top bar.

## Out of scope (since UI-only)

- Real authentication, real database, real PDF reports, real payments, real persistence. All actions show success toasts and update local state only. Easy to upgrade to Lovable Cloud later without redesigning the UI.
