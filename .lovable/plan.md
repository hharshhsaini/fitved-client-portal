## Plan: Admin promotion + Customer Management UI

### Step 1 — Promote you to admin
Insert an `admin` role row for your user (`vish262025@gmail.com`, id `e3179c7e-f2f5-4eb7-b35c-efa87446444a`) into `user_roles`. Your existing `client` role stays (harmless). After refresh, the Admin section unlocks.

### Step 2 — Customer onboarding (option C)
Support both:
- **Self-signup**: existing login page (already wired; auto-creates profile + `client` role via the `handle_new_user` trigger).
- **Admin-created accounts**: an "Add customer" button in Admin that creates the auth user server-side, sends them a password-setup email, and lets the admin pre-fill profile fields (name, phone, society, time slot, trainer).

### Step 3 — Admin Customers list page (`/admin/customers`)
- Table of all profiles with: name, email, phone, society, plan status, trainer.
- Search by name/email/phone, filter by plan status and trainer.
- "Add customer" button (opens dialog from Step 2).
- Click a row → customer detail page.

### Step 4 — Customer detail page (`/admin/customers/:id`)
Tabbed view:
1. **Profile** — edit name, phone, society, time_slot, assign trainer, change role (client/trainer/admin).
2. **Plan** — view/create/edit plan (type, amount, start_date, next_payment_date, payment_method, auto_renew, status).
3. **Pauses** — list pauses, create new pause (from/to dates), cancel active pause.
4. **Billing** — list billing history, add payment entry (date, amount, method).
5. **Health Reports** — list reports, upload new PDF (to `health-reports` bucket), delete, generate signed URL to view.
6. **Tasks** — list tasks assigned to client, create task (title, notes, due_date, assigned trainer), mark complete.

### Step 5 — Edge function for admin-created accounts
A `create-customer` edge function (service role) that:
- Verifies caller is admin (`has_role`).
- Creates the auth user with a generated temp password.
- Sends a password-reset/invite email so the customer sets their own password.
- Updates the auto-created profile with admin-provided fields (name, phone, society, time_slot, trainer_id).

### Step 6 — Sidebar / navigation
Add "Customers" link under the existing Admin section, visible only when `has_role(admin)` is true.

---

### Technical details

**Database changes**: none required — schema already supports everything. Just one data insert (admin role) handled via the insert tool.

**Files to create**:
- `src/pages/admin/Customers.tsx` (list)
- `src/pages/admin/CustomerDetail.tsx` (tabbed detail)
- `src/components/admin/AddCustomerDialog.tsx`
- `src/components/admin/customer-tabs/` (ProfileTab, PlanTab, PausesTab, BillingTab, HealthTab, TasksTab)
- `src/hooks/useCustomers.ts`, `useCustomer.ts` (TanStack Query)
- `supabase/functions/create-customer/index.ts` + `config.toml` entry (`verify_jwt = true`)

**Files to edit**:
- `src/App.tsx` — add `/admin/customers` and `/admin/customers/:id` routes (admin-protected).
- `src/components/AppSidebar.tsx` — add Customers link.
- `src/pages/Admin.tsx` — link/redirect into Customers.

**RLS**: Existing admin policies already allow full CRUD on profiles, plans, pauses, billing_history, health_reports, tasks, user_roles. No new policies needed.

**Storage**: `health-reports` bucket exists. Admin uploads via signed upload; viewing via short-lived signed URLs.

**Roles**: Profile tab role-change uses `user_roles` table (insert/delete rows for `admin` / `trainer` / `client`).

---

### What you'll do after approval
1. I promote you to admin and build everything above.
2. You hard-refresh, log in, navigate to **Admin → Customers**, and start adding/managing customers.
