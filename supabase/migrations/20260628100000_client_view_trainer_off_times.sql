-- Let a client read the off-days of their own assigned trainer, so the
-- customer dashboard calendar can show trainer-off days.
-- profiles.trainer_id and trainer_off_times.trainer_id both reference trainers.id.
CREATE POLICY "clients view own trainer off times"
ON public.trainer_off_times FOR SELECT
USING (
  trainer_id = (SELECT trainer_id FROM public.profiles WHERE id = auth.uid())
);
