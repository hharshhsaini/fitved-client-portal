/**
 * Trainer referral earnings.
 *
 * A trainer refers a customer by name + mobile. Earnings are DERIVED, never
 * stored: 5% of the referred customer's NET billing (payments minus refunds)
 * for money that came in on/after the referral was created. Because refunds
 * are already negative billing, a full refund pulls the earning back to zero
 * automatically — "jaise aaya waise jaayega."
 */

export const REFERRAL_RATE = 0.05; // 5%

export interface ReferralRow {
  id: string;
  trainer_id: string;
  referred_name: string;
  referred_phone: string; // normalized 10-digit
  referred_address?: string | null; // optional, for admin verification
  created_at: string;
}

export interface ProfileLite { id: string; phone: string | null }
export interface BillingLite { user_id: string; amount: number; payment_date: string; type: string | null }

export type ReferralStatus = "invited" | "joined" | "purchased" | "refunded";

export interface ReferralComputed extends ReferralRow {
  status: ReferralStatus;
  profileId: string | null; // set once they create an account
  paid: number;             // gross payments counted (>= referral date)
  refunded: number;         // refunds counted
  netPaid: number;          // paid - refunded
  earning: number;          // 5% of max(0, netPaid)
}

const STATUS_LABEL: Record<ReferralStatus, string> = {
  invited: "Invited",
  joined: "Signed up",
  purchased: "Purchased",
  refunded: "Refunded",
};
export const referralStatusLabel = (s: ReferralStatus) => STATUS_LABEL[s];

export function computeReferrals(
  referrals: ReferralRow[],
  profiles: ProfileLite[],
  billing: BillingLite[],
): ReferralComputed[] {
  const profByPhone = new Map<string, ProfileLite>();
  for (const p of profiles) if (p.phone) profByPhone.set(p.phone, p);

  const billingByUser = new Map<string, BillingLite[]>();
  for (const b of billing) {
    const list = billingByUser.get(b.user_id) ?? [];
    list.push(b);
    billingByUser.set(b.user_id, list);
  }

  return referrals.map((r) => {
    const prof = profByPhone.get(r.referred_phone) ?? null;
    if (!prof) {
      return { ...r, status: "invited", profileId: null, paid: 0, refunded: 0, netPaid: 0, earning: 0 };
    }
    // Only count money dated on/after the referral was made — no back-crediting
    // a customer who already existed and paid before being "referred".
    const refDate = r.created_at.slice(0, 10);
    const bills = (billingByUser.get(prof.id) ?? []).filter((b) => b.payment_date >= refDate);

    let paid = 0, refunded = 0;
    for (const b of bills) {
      const amt = Number(b.amount) || 0;
      if (b.type === "refund" || amt < 0) refunded += Math.abs(amt);
      else paid += amt;
    }
    const netPaid = paid - refunded;
    const earning = Math.max(0, netPaid) * REFERRAL_RATE;

    let status: ReferralStatus;
    if (paid <= 0) status = "joined";
    else if (netPaid <= 0) status = "refunded";
    else status = "purchased";

    return { ...r, status, profileId: prof.id, paid, refunded, netPaid, earning };
  });
}

export function summarizeEarnings(computed: ReferralComputed[]) {
  return {
    total: computed.reduce((s, r) => s + r.earning, 0),
    purchased: computed.filter((r) => r.status === "purchased").length,
    joined: computed.filter((r) => r.status === "joined").length,
    invited: computed.filter((r) => r.status === "invited").length,
    refunded: computed.filter((r) => r.status === "refunded").length,
  };
}
