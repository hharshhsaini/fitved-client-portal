-- Public bucket in the MAIN FitVed project to host society poll photos, so the
-- images live in one DB (not the repo, not the separate polls project).
-- Seed images are uploaded by scripts/upload-society-images.mjs; future
-- admin-added society photos upload here too.

INSERT INTO storage.buckets (id, name, public)
VALUES ('society-images', 'society-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "society_images_read"   ON storage.objects;
DROP POLICY IF EXISTS "society_images_write"  ON storage.objects;
DROP POLICY IF EXISTS "society_images_update" ON storage.objects;
DROP POLICY IF EXISTS "society_images_delete" ON storage.objects;
CREATE POLICY "society_images_read"   ON storage.objects FOR SELECT USING (bucket_id = 'society-images');
CREATE POLICY "society_images_write"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'society-images');
CREATE POLICY "society_images_update" ON storage.objects FOR UPDATE USING (bucket_id = 'society-images');
CREATE POLICY "society_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'society-images');
