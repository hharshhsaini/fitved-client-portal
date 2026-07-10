-- Migration: grant admins full write access on trainer_off_times
-- Context: The existing "admins view all off times" policy only allows SELECT.
-- This migration adds a separate all-operations policy so admins can
-- insert, update, and delete off-times on behalf of any trainer.

CREATE POLICY "admins manage all off times"
ON public.trainer_off_times FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
