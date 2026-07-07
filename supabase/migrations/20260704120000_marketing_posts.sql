-- Marketing feed: promo/announcement cards published by the admin, shown to
-- customers and trainers. Run in the Supabase SQL Editor of project
-- eoexvygolxoygoqfrjzc.

CREATE TABLE IF NOT EXISTS public.marketing_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caption text,
  media_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  cta_label text CHECK (cta_label IN ('Apply', 'View')),
  cta_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Public bucket so media renders directly in the feed without signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing', 'marketing', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "marketing read" ON storage.objects;
CREATE POLICY "marketing read" ON storage.objects
  FOR SELECT USING (bucket_id = 'marketing');

DROP POLICY IF EXISTS "marketing insert" ON storage.objects;
CREATE POLICY "marketing insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'marketing');

DROP POLICY IF EXISTS "marketing delete" ON storage.objects;
CREATE POLICY "marketing delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'marketing');
