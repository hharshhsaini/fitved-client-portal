-- Trainer time slots: which slots a trainer runs in each society.
-- Managed by the admin from Admin → Trainers → Edit trainer.
-- Run this in the Supabase SQL Editor of project eoexvygolxoygoqfrjzc.

CREATE TABLE IF NOT EXISTS public.trainer_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  time_slot text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, society_id, time_slot)
);

-- The app runs on the anon key (custom auth) — leave RLS disabled like the
-- other tables so reads/writes work.
