-- Per-plan discount in rupees. Base price stays in `amount`;
-- the customer pays (amount - discount).
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;
