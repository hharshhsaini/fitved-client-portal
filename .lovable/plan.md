## Goal

Remove every mock data source. The app will only show real data from your manually-connected Supabase project — no demo fallbacks, no `mockData.ts`.

## Prerequisite (you do this once)

1. In your Supabase project, run the SQL schema I gave you earlier (profiles, user_roles + `app_role` enum + `has_role` function, plans, pauses, health_reports, tasks, RLS policies, `handle_new_user` trigger).
2. Create a private storage bucket named `health-reports`.
3. Click the green **Supabase** button in Lovable to connect the project. This generates `src/integrations/supabase/client.ts` and `types.ts` automatically.
4. Tell me it's connected — then I run the steps below.

If any of that isn't done yet, the new code will fail to compile (no Supabase client) or fail at runtime (no tables). So order matters.

## What I'll do after Supabase is connected

### 1. Real auth
- Rewrite `src/contexts/AuthContext.tsx` to use `supabase.auth`:
  - `onAuthStateChange` listener set up BEFORE `getSession()`.
  - Exposes `user`, `session`, `profile`, `role`, `loading`, `signIn`, `signUp`, `signOut`.
- Rewrite `src/pages/Login.tsx`:
  - Real `signInWithPassword` and `signUp` (with `emailRedirectTo: window.location.origin`).
  - Real "Forgot password?" → `resetPasswordForEmail` with `redirectTo: ${origin}/reset-password`.
- New `src/pages/ResetPassword.tsx` (public route) → `supabase.auth.updateUser({ password })`.
- Update `ProtectedRoute` to wait for `loading`, check real session, and gate `/admin` on `role === 'admin'` from the `user_roles` table.
- Add `/reset-password` route to `App.tsx`.

### 2. Replace mock data with live queries (TanStack Query)
- **Dashboard** — fetch active plan, latest health report, profile, active pause from DB.
- **Plan** — fetch current plan + billing rows.
- **Pause** — `usePauseStore` becomes thin wrappers around `pauses` inserts/updates; history comes from `useQuery`.
- **Health** — list `health_reports` for the user; download via short-lived signed URL from the `health-reports` bucket.
- **Profile** — read/update `profiles` row (phone, society, time slot, trainer).
- **Admin** — list all clients (admin-only via `has_role`); update plan/trainer/status; upload reports to storage + insert `health_reports` row.

### 3. Empty states (no fake fallbacks)
Each page renders an explicit empty state when the signed-in user has no data yet (e.g. "No plan assigned yet — your trainer will set this up."). No demo values are ever shown.

### 4. Cleanup
- Delete `src/lib/mockData.ts`.
- Move the small helpers (`formatDate`, `daysBetween`) to `src/lib/dates.ts`.
- Remove every `mock*` import across the app.

## Technical details

- Roles live in `user_roles` (never on `profiles`). Admin checks go through the `has_role()` security-definer function inside RLS, so there's no recursion risk.
- All reads use TanStack Query; mutations invalidate the relevant query keys.
- Storage downloads use signed URLs, not public URLs — the bucket stays private.
- **First admin**: after you sign up the first time, run this once in the Supabase SQL editor:
  ```sql
  insert into public.user_roles (user_id, role)
  values ('<your-auth-uid>', 'admin');
  ```
  I'll show your UID on the Profile page to make this easy.

## Files

**New**: `src/pages/ResetPassword.tsx`, `src/lib/dates.ts`, `src/hooks/useProfile.ts`, `src/hooks/usePlan.ts`, `src/hooks/usePauses.ts`, `src/hooks/useHealthReports.ts`, `src/hooks/useClients.ts`.

**Rewritten**: `AuthContext.tsx`, `Login.tsx`, `ProtectedRoute.tsx`, `pauseStore.tsx`, `Dashboard.tsx`, `Plan.tsx`, `Pause.tsx`, `Health.tsx`, `Profile.tsx`, `Admin.tsx`, `App.tsx`.

**Deleted**: `src/lib/mockData.ts`.

## After approval

Confirm Supabase is connected (green button done, schema run, bucket created), then I execute the rewrite in one pass.
