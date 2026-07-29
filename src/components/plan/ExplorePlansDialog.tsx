import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const GOLD   = "#f0a720";
const NAVY   = "#1E3A5F";
const MUTED  = "#8a8f9e";
const BORDER = "rgba(30,58,95,0.08)";
const GOLD_DEEP = "#b07d10";
const WHATSAPP = "#25D366";
const WA_NUMBER = "919606047293";

interface Props {
  userId: string;
  customerName: string;
  customerPhone?: string;
}

interface Option {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  total_sessions: number | null;
  badge: string | null;
}

/**
 * The plan cards themselves — rendered inline on the Plan page whenever the
 * customer has no active plan (so the catalog is always visible), and inside
 * the "Explore other plans" dialog for customers mid-plan.
 */
export function PlanOptionsList({ userId, customerName, customerPhone }: Props) {
  const { data: options = [] } = useQuery({
    queryKey: ["plan-options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_options").select("*").eq("active", true)
        .order("sort_order").order("duration_months");
      return (data ?? []) as Option[];
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["plan-price-overrides", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_price_overrides").select("plan_option_id,price").eq("user_id", userId);
      return data ?? [];
    },
  });

  const overrideMap = new Map(overrides.map((o) => [o.plan_option_id, Number(o.price)]));

  // Per-month comparison against the 1-month plan (this customer's effective
  // prices, i.e. after any custom overrides). Recomputes automatically when
  // the admin changes catalog prices or per-customer prices.
  const effectivePrice = (o: Option) => overrideMap.get(o.id) ?? Number(o.price);
  const baselineMonthly = (() => {
    const oneMonth = options.find((o) => o.duration_months === 1);
    return oneMonth ? effectivePrice(oneMonth) / 1 : null;
  })();

  const monthlyInfo = (o: Option) => {
    if (!o.duration_months || o.duration_months < 1) return null;
    const perMonth = effectivePrice(o) / o.duration_months;
    if (o.duration_months === 1 || baselineMonthly == null) {
      return { perMonth, savePct: 0, saveAmt: 0 };
    }
    const saveAmt = Math.max(0, baselineMonthly - perMonth);
    const savePct = baselineMonthly > 0 ? Math.round((saveAmt / baselineMonthly) * 100) : 0;
    return { perMonth, savePct, saveAmt };
  };

  const waLink = (o: Option) => {
    const label = /plan/i.test(o.name) ? o.name : `${o.name} plan`;
    const signOff = [customerName, customerPhone].filter(Boolean).join(", ");
    const text = `Hi FitVed, I'm interested in the ${label}.${signOff ? ` — ${signOff}` : ""}`;
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {options.length === 0 ? (
        <p style={{ fontSize: 14, color: MUTED, padding: 8 }}>No plans available right now.</p>
      ) : options.map((o) => {
        const price = overrideMap.get(o.id) ?? Number(o.price);
        const isOverride = overrideMap.has(o.id);
        const monthly = monthlyInfo(o);
        return (
          <div key={o.id} className="rounded-2xl relative text-left"
            style={{ background: "#fff", border: `${o.badge ? 2 : 1}px solid ${o.badge ? GOLD : BORDER}`, padding: 16 }}>
            {o.badge && (
              <span className="absolute font-semibold" style={{ top: -10, left: 16, background: GOLD, color: "#fff", fontSize: 11, padding: "3px 10px", borderRadius: 8 }}>
                {o.badge}
              </span>
            )}
            <div className="flex justify-between items-start">
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>{o.name}</p>
                {o.total_sessions != null && (
                  <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{o.total_sessions} sessions</p>
                )}
                {monthly && monthly.savePct > 0 && (
                  <span className="inline-block rounded-full font-bold mt-2"
                    style={{ fontSize: 11, color: "#1b7a43", background: "#e6f7ed", padding: "3px 10px" }}>
                    {monthly.savePct}% off · save ₹{Math.round(monthly.saveAmt).toLocaleString("en-IN")}/month
                  </span>
                )}
              </div>
              <div className="text-right">
                <p style={{ fontSize: 22, fontWeight: 600, color: NAVY }}>₹{price.toLocaleString("en-IN")}</p>
                {monthly && o.duration_months > 1 && (
                  <p style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>
                    ₹{Math.round(monthly.perMonth).toLocaleString("en-IN")}/month
                  </p>
                )}
                {isOverride && <p style={{ fontSize: 11, color: GOLD_DEEP }}>Your price</p>}
              </div>
            </div>
            <a
              href={waLink(o)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl font-semibold mt-3.5"
              style={{ background: WHATSAPP, color: "#fff", fontSize: 14, padding: "11px 0", textDecoration: "none" }}
            >
              <MessageCircle size={18} color="#fff" /> Chat on WhatsApp
            </a>
          </div>
        );
      })}
    </div>
  );
}

export function ExplorePlansDialog({ userId, customerName, customerPhone }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full font-semibold"
        style={{ background: "rgba(240,167,32,0.14)", color: GOLD_DEEP, fontSize: 13, padding: "8px 14px" }}
      >
        <Sparkles size={15} color={GOLD_DEEP} /> Explore other plans
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: NAVY }}>Explore other plans</DialogTitle>
            <p style={{ fontSize: 13, color: MUTED }}>Pick a duration and we'll take it forward on WhatsApp.</p>
          </DialogHeader>
          <div className="mt-1">
            <PlanOptionsList userId={userId} customerName={customerName} customerPhone={customerPhone} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
