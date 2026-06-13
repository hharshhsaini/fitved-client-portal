-- Security: trainers must never see client DOB (it's the login password)
-- or plan prices. RLS is row-level, so drop the column-unsafe policies and
-- replace trainer reads with a column-safe SECURITY DEFINER function.

-- 1) Drop unsafe trainer policies
DROP POLICY IF EXISTS "trainers view their clients profiles" ON public.profiles;
DROP POLICY IF EXISTS "trainers view assigned client plans" ON public.plans;

-- 2) Column-safe roster function.
--    Trainers: returns their own assigned clients (safe columns only).
--    Admins:   may pass _trainer_id to view any trainer's roster (view-as).
CREATE OR REPLACE FUNCTION public.get_trainer_clients(_trainer_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  society_id uuid,
  time_slot text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.phone, p.society_id, p.time_slot
  FROM public.profiles p
  WHERE p.trainer_id = COALESCE(
    CASE WHEN public.has_role(auth.uid(), 'admin') THEN _trainer_id END,
    (SELECT t.id FROM public.trainers t WHERE t.user_id = auth.uid() LIMIT 1)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_trainer_clients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trainer_clients(uuid) TO authenticated;
