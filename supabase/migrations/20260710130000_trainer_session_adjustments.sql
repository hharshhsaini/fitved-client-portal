-- Manual per-month corrections to a trainer's computed session count.
-- The count itself is derived (scheduled batches − off-days + extra classes);
-- this lets the admin fix any month by a +/- delta.
-- Run in the Supabase SQL Editor of project eoexvygolxoygoqfrjzc.

CREATE TABLE IF NOT EXISTS public.trainer_session_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  month text NOT NULL, -- 'YYYY-MM'
  delta integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, month)
);

-- App runs on the anon key (custom auth) — keep RLS off like the other tables.
