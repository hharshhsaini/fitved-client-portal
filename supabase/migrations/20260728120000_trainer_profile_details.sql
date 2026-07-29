-- Trainer profile details: photo, certificates, education, multi-specialization,
-- intro video and a short bio. Stored for profile purposes; NOT shown to end
-- users yet. Mirrors the app's open-RLS / anon-key pattern.

-- 1. Extra columns on trainers ------------------------------------------------
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS photo_path        text,
  ADD COLUMN IF NOT EXISTS intro_video_path  text,
  ADD COLUMN IF NOT EXISTS education          text,
  ADD COLUMN IF NOT EXISTS bio                text,
  ADD COLUMN IF NOT EXISTS specializations    text[] NOT NULL DEFAULT '{}';

-- 2. Certificates: one trainer -> many files ---------------------------------
CREATE TABLE IF NOT EXISTS public.trainer_certificates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  file_path   text NOT NULL,
  file_name   text,
  mime_type   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trainer_certificates_trainer_idx
  ON public.trainer_certificates(trainer_id);

ALTER TABLE public.trainer_certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trainer_certificates_all" ON public.trainer_certificates;
CREATE POLICY "trainer_certificates_all" ON public.trainer_certificates
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Storage bucket for trainer assets (photo, video, certificate files) ------
INSERT INTO storage.buckets (id, name, public)
VALUES ('trainer-assets', 'trainer-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "trainer_assets_read"   ON storage.objects;
DROP POLICY IF EXISTS "trainer_assets_write"  ON storage.objects;
DROP POLICY IF EXISTS "trainer_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "trainer_assets_delete" ON storage.objects;
CREATE POLICY "trainer_assets_read"   ON storage.objects FOR SELECT USING (bucket_id = 'trainer-assets');
CREATE POLICY "trainer_assets_write"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'trainer-assets');
CREATE POLICY "trainer_assets_update" ON storage.objects FOR UPDATE USING (bucket_id = 'trainer-assets');
CREATE POLICY "trainer_assets_delete" ON storage.objects FOR DELETE USING (bucket_id = 'trainer-assets');
