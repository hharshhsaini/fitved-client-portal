-- Phase 1 — Find Trainers: data foundation (additive, safe, no data loss).
-- Run ONCE in the MAIN FitVed Supabase project → SQL Editor.
-- Media/testimonial files reuse the existing public `trainer-assets` bucket
-- (folders media/ and testimonials/ are implicit — no bucket change needed).

-- 1. New trainer profile columns -------------------------------------------
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS gender               text,
  ADD COLUMN IF NOT EXISTS languages            text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS city                 text,
  ADD COLUMN IF NOT EXISTS headline             text,
  ADD COLUMN IF NOT EXISTS about                text,
  ADD COLUMN IF NOT EXISTS availability_online  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_offline boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram            text,
  ADD COLUMN IF NOT EXISTS linkedin             text,
  ADD COLUMN IF NOT EXISTS youtube              text,
  ADD COLUMN IF NOT EXISTS website              text,
  ADD COLUMN IF NOT EXISTS facebook             text,
  ADD COLUMN IF NOT EXISTS slug                 text;

-- 2. Backfill a unique, name-derived slug for existing trainers -------------
WITH base AS (
  SELECT id,
         NULLIF(trim(both '-' FROM regexp_replace(lower(coalesce(name, 'trainer')),
                                                   '[^a-z0-9]+', '-', 'g')), '') AS b
  FROM public.trainers
  WHERE slug IS NULL
),
ranked AS (
  SELECT id, b, row_number() OVER (PARTITION BY b ORDER BY id) AS rn FROM base
)
UPDATE public.trainers t
SET slug = CASE WHEN r.rn = 1 THEN r.b ELSE r.b || '-' || r.rn END
FROM ranked r
WHERE t.id = r.id AND r.b IS NOT NULL;

-- Fallback for blank/unnamed trainers
UPDATE public.trainers
SET slug = 'trainer-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS trainers_slug_key ON public.trainers (slug) WHERE slug IS NOT NULL;

-- 3. Trainer media (transformation photos, workout images/videos, reels) ----
CREATE TABLE IF NOT EXISTS public.trainer_media (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('transformation','workout_image','workout_video','reel')),
  file_path  text NOT NULL,
  caption    text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trainer_media_trainer_idx ON public.trainer_media (trainer_id);
ALTER TABLE public.trainer_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trainer_media_all" ON public.trainer_media;
CREATE POLICY "trainer_media_all" ON public.trainer_media FOR ALL USING (true) WITH CHECK (true);

-- 4. Trainer testimonials ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trainer_testimonials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id          uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  client_name         text NOT NULL,
  client_image        text,
  transformation_image text,
  before_image        text,
  after_image         text,
  rating              int,
  review              text,
  video_url           text,
  sort_order          int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trainer_testimonials_trainer_idx ON public.trainer_testimonials (trainer_id);
ALTER TABLE public.trainer_testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trainer_testimonials_all" ON public.trainer_testimonials;
CREATE POLICY "trainer_testimonials_all" ON public.trainer_testimonials FOR ALL USING (true) WITH CHECK (true);

-- 5. Book-Trial lead path: attribution + an anon-writable insert policy ------
-- The existing `leads` insert policy rejects the anon publishable key; add a
-- permissive open INSERT policy (OR-combined) so the trial modal actually saves,
-- and a column to record which trainer's profile drove the lead.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_trainer text;
DROP POLICY IF EXISTS "leads_anon_insert" ON public.leads;
CREATE POLICY "leads_anon_insert" ON public.leads FOR INSERT WITH CHECK (true);
