-- Find Trainers cleanup: drop columns removed from the profile UI.
-- Safe / idempotent (IF EXISTS). No data preserved for these fields — they
-- were removed from the builder, so all values were empty/unused.
-- The app code no longer selects or writes these columns (commit bad5d73).

-- Trainer profile: headline + LinkedIn/YouTube socials removed.
ALTER TABLE public.trainers
  DROP COLUMN IF EXISTS headline,
  DROP COLUMN IF EXISTS linkedin,
  DROP COLUMN IF EXISTS youtube;

-- Testimonials: transformation / before / after image slots removed
-- (client photo, rating, review, and video_url are kept).
ALTER TABLE public.trainer_testimonials
  DROP COLUMN IF EXISTS transformation_image,
  DROP COLUMN IF EXISTS before_image,
  DROP COLUMN IF EXISTS after_image;
