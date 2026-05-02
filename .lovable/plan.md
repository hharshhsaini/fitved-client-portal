## Plan: Phone + birthdate login for customers (admin keeps email/password)

### How it will work

**Customers**
- Sign up with: name, phone (10 digits), date of birth.
- Log in with: phone + DOB (entered as DDMMYYYY, e.g. `26041988`).
- Internally we store the phone as a synthetic email (`<phone>@phone.fitved.local`) so Supabase auth accepts it. The DOB string becomes the password.

**Admins (you)**
- Keep logging in exactly as today with your real email + password.
- Your existing account (`vish262025@gmail.com`) and admin role are untouched.

### Important caveats (please read)

1. **Security is weak.** Anyone who knows a customer's phone + DOB can log into their account, see health reports, billing, etc. Acceptable only because customers are non-sensitive in this flow and admins remain protected.
2. **DOB must be entered consistently.** We'll force `DDMMYYYY` (8 digits, no slashes) everywhere — signup, login, and admin-created accounts — otherwise the "password" won't match.
3. **Phone is the unique ID.** Two customers cannot share a phone number. If a customer mistypes their phone at signup, only an admin can fix it.
4. **DOB cannot be changed by the customer** without effectively changing their password. We'll add an admin-only "Reset DOB/password" action on the customer detail page.
5. **Your admin status is safe.** Roles live in the `user_roles` table keyed by user ID, not by email or phone. Login method changes don't touch it.

### Login screen redesign

The `/login` page becomes tabbed:

```text
┌─────────────────────────────────┐
│  [ Customer ]   [ Staff ]       │  ← two tabs
├─────────────────────────────────┤
│  Phone:    [__________]         │
│  Birthday: [DD][MM][YYYY]       │
│  [   Sign in   ]                │
│  New here? Create account →     │
└─────────────────────────────────┘
```

- **Customer** tab: phone + DOB fields, with Sign-in / Sign-up toggle.
- **Staff** tab: existing email + password form (unchanged), with "Forgot password".

### Signup flow (customer)

Form fields: Name, Phone, Date of birth (date picker), confirm DOB.
On submit:
- Validate phone is 10 digits, DOB is a real date, customer is ≥ 13 years old.
- Call `supabase.auth.signUp` with email = `<phone>@phone.fitved.local`, password = `DDMMYYYY`, metadata `{ name, phone, dob }`.
- Trigger `handle_new_user` populates the profile + `client` role automatically.

### Admin "Add customer" flow

Update `AddCustomerDialog` + `create-customer` edge function:
- Required fields: name, phone, DOB. Email becomes optional.
- Edge function builds the synthetic email and uses DOB as the password.
- No invite email needed (customer already knows their DOB).
- Adds a "Reset DOB" button on the Profile tab so admins can update it later.

### Files to change

- `src/pages/Login.tsx` — tabbed UI, phone/DOB form, validation.
- `src/contexts/AuthContext.tsx` — add `signInWithPhone(phone, dob)` and `signUpWithPhone(name, phone, dob)`; keep existing email helpers for staff.
- `src/lib/phoneAuth.ts` (new) — helpers: `phoneToEmail(phone)`, `dobToPassword(date)`, `formatDob(input)`, validators.
- `src/components/admin/AddCustomerDialog.tsx` — replace email field with phone + DOB.
- `src/pages/admin/CustomerDetail.tsx` (Profile tab) — add "Reset DOB" admin action.
- `supabase/functions/create-customer/index.ts` — accept `phone` + `dob`, build synthetic email, set DOB as password, drop invite email.
- New edge function `reset-customer-dob` — admin-only, updates the customer's password to the new DOB.

### Database

No schema changes. We'll store DOB in `profiles` so admins can see it without decoding the password — requires one small migration:
- Add `dob date` column to `profiles` (nullable for existing accounts including yours).
- Update `handle_new_user` to copy `dob` from signup metadata into the profile.

### Your account specifically

- You stay on email/password (Staff tab).
- Your `admin` role row in `user_roles` is unchanged.
- After deploy, hard-refresh, click **Staff**, log in as before.

### What you'll do after approval

1. I make all the code changes above.
2. You hard-refresh, test the **Staff** tab with your existing email/password — should work unchanged.
3. Test the **Customer** tab by self-signing-up a dummy account with a phone + DOB, then logging back in.
