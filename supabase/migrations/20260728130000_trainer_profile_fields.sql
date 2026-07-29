-- Extra trainer profile fields (second pass): years of experience, clients
-- trained, a social link, the areas a trainer can serve, and an optional CV.
-- Builds on 20260728120000_trainer_profile_details.sql (trainer-assets bucket
-- + trainer_certificates already created there).

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS years_experience int,
  ADD COLUMN IF NOT EXISTS clients_trained  int,
  ADD COLUMN IF NOT EXISTS social_link      text,
  ADD COLUMN IF NOT EXISTS service_areas    text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cv_path          text;
