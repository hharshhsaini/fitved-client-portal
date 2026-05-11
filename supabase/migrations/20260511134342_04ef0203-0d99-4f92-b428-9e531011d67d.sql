-- Allow trainers to view pauses of their assigned clients
CREATE POLICY "trainers view assigned client pauses"
ON public.pauses
FOR SELECT
USING (
  user_id IN (
    SELECT p.id FROM public.profiles p
    JOIN public.trainers t ON t.id = p.trainer_id
    WHERE t.user_id = auth.uid()
  )
);

-- Function: list all batches (trainer + time_slot groupings) in the current user's society
CREATE OR REPLACE FUNCTION public.get_my_society_batches()
RETURNS TABLE (
  society_id uuid,
  society_name text,
  trainer_id uuid,
  trainer_name text,
  time_slot text,
  member_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT society_id FROM public.profiles WHERE id = auth.uid()
  )
  SELECT
    p.society_id,
    s.name AS society_name,
    p.trainer_id,
    t.name AS trainer_name,
    p.time_slot,
    COUNT(*)::bigint AS member_count
  FROM public.profiles p
  LEFT JOIN public.societies s ON s.id = p.society_id
  LEFT JOIN public.trainers t ON t.id = p.trainer_id
  WHERE p.society_id = (SELECT society_id FROM me)
    AND p.society_id IS NOT NULL
    AND p.time_slot IS NOT NULL
  GROUP BY p.society_id, s.name, p.trainer_id, t.name, p.time_slot
  ORDER BY p.time_slot;
$$;

-- Function: list active pauses for current trainer's clients
CREATE OR REPLACE FUNCTION public.get_trainer_client_pauses()
RETURNS TABLE (
  pause_id uuid,
  client_id uuid,
  client_name text,
  society text,
  time_slot text,
  from_date date,
  to_date date,
  status pause_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pa.id AS pause_id,
    pr.id AS client_id,
    pr.name AS client_name,
    pr.society,
    pr.time_slot,
    pa.from_date,
    pa.to_date,
    pa.status
  FROM public.pauses pa
  JOIN public.profiles pr ON pr.id = pa.user_id
  JOIN public.trainers t ON t.id = pr.trainer_id
  WHERE t.user_id = auth.uid()
  ORDER BY pa.from_date DESC;
$$;