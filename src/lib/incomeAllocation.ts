/**
 * Income Allocation Utility
 * 
 * When a customer pays for a multi-month plan (e.g., 36 sessions ≈ 3 months),
 * the payment should be split equally across every calendar month the plan covers —
 * NOT booked entirely in the payment month.
 *
 * Example:
 *   Plan: start 2026-07-01, end 2026-09-26, amount ₹9,000
 *   → { "2026-07": 3000, "2026-08": 3000, "2026-09": 3000 }
 *
 * This makes the admin dashboard income numbers reflect WHEN the value is
 * being delivered, not just when the cash was received.
 */

/**
 * How many months of value a plan represents, from its duration in days.
 * A "3-month" plan (36 sessions) runs ~90 days even when pauses stretch it a
 * little, so rounding days/30 gives 1 for monthly plans, 3 for quarterly,
 * 6 for half-yearly — matching the packages the admin sells.
 */
function planDurationMonths(startDate: string, endDate: string): number {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  const days = ms / 86_400_000 + 1;
  if (!Number.isFinite(days) || days <= 0) return 1;
  return Math.max(1, Math.round(days / 30));
}

/** "YYYY-MM" key for the month `offset` months after the given date's month. */
function monthKeyFrom(dateISO: string, offset: number): string {
  const y = parseInt(dateISO.slice(0, 4), 10);
  const m = parseInt(dateISO.slice(5, 7), 10) - 1 + offset;
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Splits `netAmount` into equal monthly slices — one per month of the plan's
 * duration — starting at the plan's start month. A ₹9,000 3-month plan
 * starting 13 June yields June ₹3,000, July ₹3,000, August ₹3,000 (NOT four
 * calendar-month slivers). The final month absorbs any rounding remainder so
 * the total is always exact.
 *
 * Returns an empty object if netAmount <= 0 or dates are invalid.
 */
export function allocatePlanIncome(
  startDate: string, // "YYYY-MM-DD"
  endDate: string,   // "YYYY-MM-DD"
  netAmount: number, // amount - discount (already net)
): Record<string, number> {
  if (!startDate || !endDate || netAmount <= 0) return {};

  const count = planDurationMonths(startDate, endDate);
  const months: string[] = [];
  for (let i = 0; i < count; i++) months.push(monthKeyFrom(startDate, i));

  const slicePerMonth = Math.floor(netAmount / months.length);
  const remainder = netAmount - slicePerMonth * months.length;

  const result: Record<string, number> = {};
  months.forEach((key, i) => {
    // Last month gets the remainder to keep total exact (e.g. ₹10,000 / 3 = ₹3,333, ₹3,333, ₹3,334)
    result[key] = slicePerMonth + (i === months.length - 1 ? remainder : 0);
  });
  return result;
}

/**
 * Builds a combined monthly income map from:
 * 1. Plan rows with plan_id linked — prorated using the plan's start/end dates.
 * 2. Billing entries without plan_id (manual entries, refunds) — booked to payment_date month.
 *
 * This ensures that:
 * - Every newly created plan is automatically prorated (plan_id is set on billing entry).
 * - Old / manual billing entries continue to appear in their payment month.
 * - Refunds (negative amounts) are subtracted from the correct month.
 *
 * @param billingRows  - Raw rows from billing_history (plan_id may be null)
 * @param planMap      - Map of plan_id → plan row (with start_date, end_date)
 */
export function buildMonthlyIncomeFromBilling(
  billingRows: {
    amount: number;
    payment_date: string;
    plan_id?: string | null;
  }[],
  planMap: Map<string, { start_date: string; end_date: string }>,
): Record<string, number> {
  const totals: Record<string, number> = {};

  for (const b of billingRows) {
    const net = Number(b.amount);
    if (!b.plan_id || !planMap.has(b.plan_id)) {
      // Manual entry or legacy row — book to payment_date month
      if (b.payment_date) {
        const mKey = b.payment_date.slice(0, 7);
        totals[mKey] = (totals[mKey] ?? 0) + net;
      }
      continue;
    }

    // Linked plan — prorate across months
    const plan = planMap.get(b.plan_id)!;
    const slices = allocatePlanIncome(plan.start_date, plan.end_date, net);
    for (const [month, amt] of Object.entries(slices)) {
      totals[month] = (totals[month] ?? 0) + amt;
    }
  }

  return totals;
}

/** Returns a sorted array of { key: "YYYY-MM", label: "July 2026", amount } objects. */
export function monthlyBreakdownArray(
  totals: Record<string, number>,
): { key: string; label: string; amount: number }[] {
  return Object.entries(totals)
    .map(([key, amount]) => {
      const d = new Date(key + "-02T12:00:00");
      const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      return { key, label, amount };
    })
    .sort((a, b) => b.key.localeCompare(a.key)); // newest first
}

/** Returns "YYYY-MM" for a date offset by `monthOffset` from today. */
export function monthKey(offsetFromToday = 0): string {
  // Anchor to day 1 — setMonth() on the 29th–31st can overshoot a month
  // (e.g. May 31 + 1 month = July 1, silently skipping June).
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offsetFromToday, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
