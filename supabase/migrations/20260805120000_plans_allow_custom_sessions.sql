-- Allow custom session counts on plans.
-- Run this in the Supabase SQL Editor of project eoexvygolxoygoqfrjzc.
--
-- The plans table originally hard-coded total_sessions to IN (8, 12, 36, 72).
-- Since then the app gained a "Custom plan — set sessions & price manually"
-- option (see plan_options.total_sessions being nullable), so admins can now
-- pick any session count (e.g. 4). The old CHECK constraint rejects those
-- inserts with: new row for relation "plans" violates check constraint
-- "plans_total_sessions_check".
--
-- Drop the fixed-set constraint and replace it with a simple positivity check.
-- Idempotent + safe to re-run.

ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_total_sessions_check;

-- Re-add a sane guard: sessions must be a positive integer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plans_total_sessions_positive'
      AND conrelid = 'public.plans'::regclass
  ) THEN
    ALTER TABLE public.plans
      ADD CONSTRAINT plans_total_sessions_positive CHECK (total_sessions > 0);
  END IF;
END $$;
