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
const WA_NUMBER = "919890471383";

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

export function ExplorePlansDialog({ userId, customerName, customerPhone }: Props) {
  const [open, setOpen] = useState(false);

  const { data: options = [] } = useQuery({
    queryKey: ["plan-options"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_options").select("*").eq("active", true)
        .order("sort_order").order("duration_months");
      return (data ?? []) as Option[];
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["plan-price-overrides", userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_price_overrides").select("plan_option_id,price").eq("user_id", userId);
      return data ?? [];
    },
  });

  const overrideMap = new Map(overrides.map((o) => [o.plan_option_id, Number(o.price)]));

  const waLink = (o: Option) => {
    const label = /plan/i.test(o.name) ? o.name : `${o.name} plan`;
    const signOff = [customerName, customerPhone].filter(Boolean).join(", ");
    const text = `Hi FitVed, I'm interested in the ${label}.${signOff ? ` — ${signOff}` : ""}`;
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  };

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

          <div className="flex flex-col gap-3 mt-1">
            {options.length === 0 ? (
              <p style={{ fontSize: 14, color: MUTED, padding: 8 }}>No plans available right now.</p>
            ) : options.map((o) => {
              const price = overrideMap.get(o.id) ?? Number(o.price);
              const isOverride = overrideMap.has(o.id);
              return (
                <div key={o.id} className="rounded-2xl relative"
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
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: 22, fontWeight: 600, color: NAVY }}>₹{price.toLocaleString("en-IN")}</p>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
