-- Trainer referrals: a trainer refers a prospective customer by name + mobile.
-- When that mobile signs up and pays, the trainer earns 5% of the net paid
-- (refunds pull it back down). Earnings are DERIVED from billing_history at
-- read time, so nothing here stores money — this table is only the referral link.
-- Run in the Supabase SQL Editor of project eoexvygolxoygoqfrjzc.

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  referred_name text NOT NULL,
  referred_phone text NOT NULL,           -- normalized 10-digit
  created_at timestamptz NOT NULL DEFAULT now(),
  -- One trainer per referred number: first to refer it owns the referral.
  UNIQUE (referred_phone)
);

CREATE INDEX IF NOT EXISTS idx_referrals_trainer ON public.referrals (trainer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_phone   ON public.referrals (referred_phone);

-- App runs on the anon key (custom auth) — keep RLS off like the other tables.
