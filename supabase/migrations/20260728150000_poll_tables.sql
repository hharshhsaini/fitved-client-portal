-- Consolidate the society-poll backend into the MAIN FitVed project.
-- The polls app's tables are created here with a `poll_` prefix so they do NOT
-- collide with the main app's existing `societies` table (trainer assignments).
-- Run this ONCE in the MAIN FitVed Supabase → SQL Editor.

-- 1. Poll societies (admin-managed communities shown on the polls landing page)
CREATE TABLE IF NOT EXISTS public.poll_societies (
    id          TEXT PRIMARY KEY,
    slug        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    location    TEXT NOT NULL,
    units_count TEXT NOT NULL,
    image_url   TEXT NOT NULL,
    description TEXT,
    badge       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Poll slots (reference data; app mainly reads src/data/pollSlots.ts)
CREATE TABLE IF NOT EXISTS public.poll_slots (
    id            TEXT PRIMARY KEY,
    category      TEXT NOT NULL CHECK (category IN ('morning', 'evening')),
    label         TEXT NOT NULL,
    display_order INT  NOT NULL
);

-- 3. Poll responses (the votes; the app's main read/write table)
CREATE TABLE IF NOT EXISTS public.poll_responses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_id   TEXT NOT NULL,
    society_name TEXT NOT NULL,
    slot_id      TEXT NOT NULL,
    slot_label   TEXT NOT NULL,
    name         TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    apartment    TEXT,
    whatsapp     TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT poll_unique_resident_per_society UNIQUE (society_id, phone_number)
);
CREATE INDEX IF NOT EXISTS poll_responses_society_phone_idx
    ON public.poll_responses (society_id, phone_number);

-- Open RLS (matches the polls app's original posture; anon key, client-gated admin)
ALTER TABLE public.poll_societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poll_societies_all" ON public.poll_societies;
CREATE POLICY "poll_societies_all" ON public.poll_societies FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "poll_slots_read" ON public.poll_slots;
CREATE POLICY "poll_slots_read" ON public.poll_slots FOR SELECT USING (true);
DROP POLICY IF EXISTS "poll_responses_all" ON public.poll_responses;
CREATE POLICY "poll_responses_all" ON public.poll_responses FOR ALL USING (true) WITH CHECK (true);

-- Live vote counts on the poll pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'poll_responses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_responses;
  END IF;
END $$;
