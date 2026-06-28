# Plan options + WhatsApp handoff — Spec

**Status:** Building.
**Decisions:** Overrides = custom price per plan per customer. Cards show sessions count + savings badge. WhatsApp message = plan + customer name prefilled (number 919890471383). Customer entry = a small "Explore other plans" button on the Plan page (just before Training days) that opens a popup/modal with the cards. Admin override panel = at the bottom of the customer's Plan tab.

---

## Data (Lovable SQL)

**`plan_options`** — default catalog (admin-managed)
- name, duration_months (1/3/6), price, total_sessions, badge (free text, optional), sort_order, active, created_at, updated_at

**`plan_price_overrides`** — per-customer exceptions ("differs for a few")
- user_id, plan_option_id (FK → plan_options, on delete cascade), price, unique(user_id, plan_option_id)

Effective price for a customer = override row if present, else `plan_options.price`.

### RLS
- `plan_options`: any authenticated user can SELECT where active; admins manage all (incl. inactive).
- `plan_price_overrides`: a customer can SELECT their own rows; admins manage all.

## Customer — Plan page section "Explore other plans"
- 3 cards (sorted by sort_order). Each: name, duration, effective price, total_sessions, badge (if set).
- Button "Chat on WhatsApp" → `https://wa.me/919890471383?text=...`
  - Text: `Hi FitVed, I'd like the {name} ({duration_months}-month) plan — ₹{price}. — {customer name}`

## Admin
1. **Plans catalog** at `/admin/plans` (new sidebar + mobile-nav item): CRUD plan_options (name, months, price, sessions, badge, active, sort).
2. **Customer detail → "Custom plan prices"** panel: lists each active plan_option with a price input; set = create/update override, clear = delete override (falls back to default).

## Notes
- Badge is admin free text for now (e.g. "Best value", "Save 15%"). Auto-computed savings % can be added later.
- No payment/checkout — handoff is WhatsApp only. No order tracking.
