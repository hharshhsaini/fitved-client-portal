-- Fix live-DB linkage for the custom (non-Supabase-Auth) login system.
-- Run this in the Supabase SQL Editor of project eoexvygolxoygoqfrjzc.
--
-- Customers/trainers/admins are rows in profiles/trainers/admins — they do NOT
-- exist in auth.users. Any foreign key pointing at auth.users therefore blocks
-- every insert made by the app. health_reports and tasks still carry those FKs.

-- 1) Drop all FK constraints on health_reports and tasks that reference auth.users
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname, rel.relname AS table_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_class frel ON frel.oid = con.confrelid
    JOIN pg_namespace fns ON fns.oid = frel.relnamespace
    WHERE con.contype = 'f'
      AND rel.relname IN ('health_reports', 'tasks')
      AND fns.nspname = 'auth'
      AND frel.relname = 'users'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', c.table_name, c.conname);
  END LOOP;
END $$;

-- Re-point them at profiles so referential integrity is kept where it matters.
-- (DROP IF EXISTS first so this script is safe to re-run.)
ALTER TABLE public.health_reports
  DROP CONSTRAINT IF EXISTS health_reports_client_id_fkey;
ALTER TABLE public.health_reports
  ADD CONSTRAINT health_reports_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_client_id_fkey;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- tasks.trainer_id is written with the signed-in staff member's session id
-- (an admins.id or trainers.user_id) — no single table can back it, so leave
-- it as a plain uuid column.

-- 2) Create the health-reports storage bucket the app uploads PDFs to
INSERT INTO storage.buckets (id, name, public)
VALUES ('health-reports', 'health-reports', false)
ON CONFLICT (id) DO NOTHING;

-- The app runs entirely on the anon key (custom auth), so storage policies
-- must allow anon access for this bucket.
DROP POLICY IF EXISTS "health reports read" ON storage.objects;
CREATE POLICY "health reports read" ON storage.objects
  FOR SELECT USING (bucket_id = 'health-reports');

DROP POLICY IF EXISTS "health reports insert" ON storage.objects;
CREATE POLICY "health reports insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'health-reports');

DROP POLICY IF EXISTS "health reports delete" ON storage.objects;
CREATE POLICY "health reports delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'health-reports');
