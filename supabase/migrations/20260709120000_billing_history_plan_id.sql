-- Add plan_id to billing_history so each payment record can be linked to its plan.
-- This enables prorated income calculation (split multi-month plan payments across months).
-- Also adds notes and type columns if not already present (used by PlanTab.tsx auto-billing).

ALTER TABLE public.billing_history
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL;

ALTER TABLE public.billing_history
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.billing_history
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'payment';

-- Index for fast plan_id lookups
CREATE INDEX IF NOT EXISTS idx_billing_history_plan_id ON public.billing_history(plan_id);
