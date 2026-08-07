-- Add a "stopped" plan status (customer stopped buying plans / churned) and
-- make sure "completed" exists too. Additive and idempotent: ADD VALUE IF NOT
-- EXISTS never errors if the value is already present, and is a no-op when the
-- live status column has already been widened to text.
--
-- Run this in the Supabase SQL editor. Until it runs, saving a plan as
-- "stopped" surfaces an instructive toast instead of a raw Postgres error.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_status') THEN
    ALTER TYPE public.plan_status ADD VALUE IF NOT EXISTS 'completed';
    ALTER TYPE public.plan_status ADD VALUE IF NOT EXISTS 'stopped';
  END IF;
END
$$;
