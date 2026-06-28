-- Catalog of selectable plan durations (1/3/6 month) shown to customers.
CREATE TABLE IF NOT EXISTS public.plan_options (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text    NOT NULL,
  duration_months integer NOT NULL,
  price           numeric NOT NULL,
  total_sessions  integer NULL,
  badge           text    NULL,
  sort_order      integer NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

-- Per-customer price exceptions. No row = customer pays the catalog default.
CREATE TABLE IF NOT EXISTS public.plan_price_overrides (
  id             uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid    NOT NULL,
  plan_option_id uuid    NOT NULL REFERENCES public.plan_options(id) ON DELETE CASCADE,
  price          numeric NOT NULL,
  created_at     timestamptz DEFAULT now() NOT NULL,
  updated_at     timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, plan_option_id)
);

ALTER TABLE public.plan_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_price_overrides ENABLE ROW LEVEL SECURITY;

-- plan_options: anyone signed in can read active plans; admins manage everything.
CREATE POLICY "anyone views active plan options"
ON public.plan_options FOR SELECT
USING (active = true);

CREATE POLICY "admins view all plan options"
ON public.plan_options FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "admins manage plan options"
ON public.plan_options FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- overrides: a customer reads their own; admins manage all.
CREATE POLICY "customers view own price overrides"
ON public.plan_price_overrides FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "admins manage price overrides"
ON public.plan_price_overrides FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
