-- Optional address on a referral, so admin can verify who was referred.
-- Run in the Supabase SQL Editor of project eoexvygolxoygoqfrjzc.

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referred_address text;
