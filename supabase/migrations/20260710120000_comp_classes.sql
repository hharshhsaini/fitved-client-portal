-- Compensation classes: extra classes a trainer takes to make up for their
-- off-days. Each record consumes one of the customer's off-day bonus classes,
-- pulling their plan end date back in. Recorded by the admin from the
-- customer detail page (like billing history).
-- Run in the Supabase SQL Editor of project eoexvygolxoygoqfrjzc.

CREATE TABLE IF NOT EXISTS public.comp_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES public.trainers(id) ON DELETE SET NULL,
  class_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comp_classes_client ON public.comp_classes(client_id);

-- App runs on the anon key (custom auth) — keep RLS off like the other tables.
