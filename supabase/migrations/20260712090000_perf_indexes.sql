-- Speed up the lookups the app actually performs. Postgres indexes primary
-- keys automatically but NOT foreign-key columns — every .eq()/.in() filter
-- below currently scans its table. Tables are small today, so this is mostly
-- future-proofing; the indexes keep queries flat as data grows.
-- Run in the Supabase SQL Editor of project eoexvygolxoygoqfrjzc.

CREATE INDEX IF NOT EXISTS idx_plans_user_id             ON public.plans (user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_user_id   ON public.billing_history (user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_plan_id   ON public.billing_history (plan_id);
CREATE INDEX IF NOT EXISTS idx_pauses_user_id            ON public.pauses (user_id);
CREATE INDEX IF NOT EXISTS idx_pauses_client_id          ON public.pauses (client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_trainer_id       ON public.profiles (trainer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_society_id       ON public.profiles (society_id);
CREATE INDEX IF NOT EXISTS idx_trainer_off_times_trainer ON public.trainer_off_times (trainer_id);
CREATE INDEX IF NOT EXISTS idx_comp_classes_trainer_id   ON public.comp_classes (trainer_id);
CREATE INDEX IF NOT EXISTS idx_comp_classes_client_id    ON public.comp_classes (client_id);
CREATE INDEX IF NOT EXISTS idx_trainer_slots_trainer_id  ON public.trainer_slots (trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_societies_trainer ON public.trainer_societies (trainer_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_client_id  ON public.health_reports (client_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role           ON public.user_roles (role);
CREATE INDEX IF NOT EXISTS idx_plan_price_overrides_user ON public.plan_price_overrides (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id           ON public.tasks (client_id);
