-- "Request Your Area" submissions from the societies poll site.
-- Lives in the MAIN FitVed project alongside the other poll_ tables. Open RLS
-- (anon-key, same posture as poll_responses). Run ONCE in the MAIN project.

CREATE TABLE IF NOT EXISTS public.poll_area_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  phone      text NOT NULL,
  area       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.poll_area_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "poll_area_requests_all" ON public.poll_area_requests;
CREATE POLICY "poll_area_requests_all" ON public.poll_area_requests
  FOR ALL USING (true) WITH CHECK (true);
