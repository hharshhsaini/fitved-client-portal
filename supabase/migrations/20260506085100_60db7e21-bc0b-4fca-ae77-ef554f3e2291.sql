-- 1. Add 'trainer' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'trainer';

-- 2. Societies
CREATE TABLE public.societies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage societies" ON public.societies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated view societies" ON public.societies
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_societies_updated
  BEFORE UPDATE ON public.societies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Trainers (separate from auth user; user_id links to auth.users for login)
CREATE TABLE public.trainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  name text NOT NULL,
  contact text,
  specialization text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage trainers" ON public.trainers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated view trainers" ON public.trainers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "trainers update own record" ON public.trainers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_trainers_updated
  BEFORE UPDATE ON public.trainers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Trainer-Society junction
CREATE TABLE public.trainer_societies (
  trainer_id uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trainer_id, society_id)
);
ALTER TABLE public.trainer_societies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage trainer_societies" ON public.trainer_societies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated view trainer_societies" ON public.trainer_societies
  FOR SELECT TO authenticated USING (true);

-- 5. Add society_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN society_id uuid REFERENCES public.societies(id) ON DELETE SET NULL;

-- Trainers can view their assigned clients (profiles where trainer.user_id = auth.uid)
-- Existing policy "trainers view their clients profiles" already covers trainer_id = auth.uid().
-- We update that to use trainer.user_id mapping.
DROP POLICY IF EXISTS "trainers view their clients profiles" ON public.profiles;
CREATE POLICY "trainers view their clients profiles" ON public.profiles
  FOR SELECT USING (
    trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid())
  );

-- 6. Replace plans table with session-based model
DROP TABLE IF EXISTS public.plans CASCADE;

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_sessions integer NOT NULL CHECK (total_sessions IN (8, 12, 36, 72)),
  training_days text[] NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  renewal_date date NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  status plan_status NOT NULL DEFAULT 'active',
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage plans" ON public.plans
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users view own plans" ON public.plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "trainers view assigned client plans" ON public.plans
  FOR SELECT USING (
    user_id IN (
      SELECT p.id FROM public.profiles p
      JOIN public.trainers t ON t.id = p.trainer_id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_plans_updated
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_plans_user_id ON public.plans(user_id);
CREATE INDEX idx_profiles_trainer_id ON public.profiles(trainer_id);
CREATE INDEX idx_profiles_society_id ON public.profiles(society_id);