-- Daily wellness tips shown on the customer Health page, managed by the admin.
-- Run in the Supabase SQL Editor of project eoexvygolxoygoqfrjzc.

CREATE TABLE IF NOT EXISTS public.daily_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- App runs on the anon key (custom auth) — keep RLS off like the other tables.
