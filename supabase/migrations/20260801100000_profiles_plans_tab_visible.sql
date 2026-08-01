-- Per-customer control for whether the client sees the "Plan" tab.
--
-- NULL  = automatic: hidden for brand-new sign-ups, shown once the customer
--         has any plan (see usePlansTabVisible + admin ProfileTab).
-- true  = admin forced it visible.
-- false = admin forced it hidden.
--
-- Additive & idempotent; the app degrades gracefully (treats the column as
-- absent → automatic) until this is run.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plans_tab_visible boolean;
