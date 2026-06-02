-- Trainer off-time / unavailability slots
CREATE TABLE IF NOT EXISTS public.trainer_off_times (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id  uuid    NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  from_date   date    NOT NULL,
  to_date     date    NOT NULL,
  time_slot   text    NULL,   -- NULL = all slots off for the date range
  reason      text    NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_date_range CHECK (to_date >= from_date)
);

ALTER TABLE public.trainer_off_times ENABLE ROW LEVEL SECURITY;

-- Trainers can fully manage their own off times
CREATE POLICY "trainers manage own off times"
ON public.trainer_off_times FOR ALL
USING (
  trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid())
)
WITH CHECK (
  trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid())
);

-- Admins can view all off times
CREATE POLICY "admins view all off times"
ON public.trainer_off_times FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);
