import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gift, UserPlus, TrendingUp, Users, Phone, Loader2, CheckCircle2, Info, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { normalizePhone, isValidPhone } from "@/lib/phoneAuth";
import {
  computeReferrals, summarizeEarnings, referralStatusLabel, REFERRAL_RATE,
  type ReferralRow, type ReferralStatus,
} from "@/lib/referrals";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// "How it works" — the full journey from referring to getting paid.
const STEPS: { title: string; body: string }[] = [
  { title: "Refer someone", body: "Enter their name, mobile number and address. The address is just so admin can verify who they are." },
  { title: "They sign up", body: "When that person creates a FitVed account with the same mobile number, they show up here as “Signed up”." },
  { title: "They buy a plan", body: "The moment they purchase a plan, their status becomes “Purchased” and your earning appears — 5% of what they paid." },
  { title: "Every plan, for lifetime", body: "It's not just their first plan. Every single time they buy or renew a plan — for as long as they stay with FitVed — you earn 5% of it. No limit on how many times." },
  { title: "You earn, transparently", body: "Your cut is added to “Your earnings” automatically. Admin sees the exact same numbers, so there's full transparency on what you're owed." },
  { title: "Refunds adjust it", body: "If they get a refund, your 5% on the refunded amount is removed too — it stays fair both ways." },
];

function HowItWorksDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="How referrals work"
          className="grid h-7 w-7 place-items-center rounded-full border-none cursor-pointer transition-colors hover:bg-muted"
          style={{ background: "rgba(30,58,95,0.07)" }}
        >
          <Info className="h-4 w-4 text-primary" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> How Refer &amp; Earn works
          </DialogTitle>
        </DialogHeader>
        <ol className="mt-1 space-y-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                style={{ background: "#1E3A5F" }}>
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_STYLE: Record<ReferralStatus, { bg: string; color: string }> = {
  invited:   { bg: "rgba(138,143,158,0.14)", color: "#5f6472" },
  joined:    { bg: "rgba(59,130,246,0.12)",  color: "#2563eb" },
  purchased: { bg: "rgba(46,158,91,0.14)",   color: "#2e9e5b" },
  refunded:  { bg: "rgba(239,68,68,0.12)",   color: "#dc2626" },
};

export default function TrainerReferrals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Resolve the trainer row from the session (session id = trainers.user_id or id)
  const { data: trainer } = useQuery({
    queryKey: ["referrals-trainer", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("trainers").select("id, name")
        .or(`user_id.eq.${user!.id},id.eq.${user!.id}`).maybeSingle();
      return data as { id: string; name: string } | null;
    },
  });

  const { data: referrals = [], isError: tableMissing } = useQuery({
    queryKey: ["my-referrals", trainer?.id],
    enabled: !!trainer,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("referrals").select("*").eq("trainer_id", trainer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReferralRow[];
    },
    retry: false,
  });

  // Referred customers' profiles (by phone) + their billing → earnings.
  const phones = useMemo(() => referrals.map((r) => r.referred_phone), [referrals]);
  const { data: matched } = useQuery({
    queryKey: ["referral-matches", phones.join(",")],
    enabled: phones.length > 0,
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles").select("id, phone").in("phone", phones);
      const ids = (profiles ?? []).map((p) => p.id);
      const { data: billing } = ids.length
        ? await supabase.from("billing_history").select("user_id, amount, payment_date, type").in("user_id", ids)
        : { data: [] as any[] };
      return { profiles: profiles ?? [], billing: billing ?? [] };
    },
  });

  const computed = useMemo(
    () => computeReferrals(referrals, matched?.profiles ?? [], matched?.billing ?? []),
    [referrals, matched],
  );
  const totals = useMemo(() => summarizeEarnings(computed), [computed]);

  const addReferral = useMutation({
    mutationFn: async () => {
      if (!trainer) throw new Error("Trainer not found");
      if (!name.trim()) throw new Error("Enter the person's name");
      const clean = normalizePhone(phone);
      if (!isValidPhone(clean)) throw new Error("Enter a valid 10-digit mobile number");

      const base = { trainer_id: trainer.id, referred_name: name.trim(), referred_phone: clean };
      const withAddr = { ...base, referred_address: address.trim() || null };

      let { error } = await (supabase as any).from("referrals").insert(withAddr);
      // The address column may not be migrated yet — fall back so referrals
      // keep working, and nudge to run the migration.
      if (error && /referred_address/.test(error.message)) {
        ({ error } = await (supabase as any).from("referrals").insert(base));
        if (!error && address.trim()) {
          toast.info("Referral saved. Run the referral-address migration to store addresses.");
        }
      }
      if (error) {
        if (/duplicate|unique/i.test(error.message)) {
          throw new Error("This number has already been referred.");
        }
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Referral added — you'll earn once they join and pay.");
      setName(""); setPhone(""); setAddress("");
      qc.invalidateQueries({ queryKey: ["my-referrals"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add referral"),
  });

  if (tableMissing) {
    return (
      <div className="max-w-2xl px-4 pt-4 md:px-0 md:pt-0">
        <h1 className="font-display text-3xl">Refer &amp; Earn</h1>
        <Card className="mt-6 p-6 rounded-2xl text-sm text-muted-foreground">
          Referrals aren't set up yet — ask your admin to run the referrals migration in Supabase.
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 px-4 pt-4 md:px-0 md:pt-0">
      <header>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-display text-3xl text-foreground flex items-center gap-2">
            <Gift className="h-7 w-7 text-primary" /> Refer &amp; Earn
          </h1>
          <HowItWorksDialog />
        </div>
        <p className="mt-1 text-muted-foreground">
          Can't take a client because you're busy? Refer them to FitVed and earn{" "}
          <span className="font-semibold text-foreground">{Math.round(REFERRAL_RATE * 100)}% every month — for lifetime</span>.
        </p>
      </header>

      {/* Earnings summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg,#1E3A5F,#2d5a8e)" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>Your earnings</p>
          <p className="mt-1 font-display text-2xl font-bold text-white">{inr(totals.total)}</p>
        </Card>
        <Card className="p-4 rounded-2xl">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Purchased</div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{totals.purchased}</p>
        </Card>
        <Card className="p-4 rounded-2xl">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Signed up</div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{totals.joined}</p>
        </Card>
        <Card className="p-4 rounded-2xl">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5" /> Invited</div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{totals.invited}</p>
        </Card>
      </div>

      {/* Add referral */}
      <Card className="p-5 rounded-2xl">
        <h2 className="font-medium flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Refer someone</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); addReferral.mutate(); }}
          className="mt-4 space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rname">Their name</Label>
              <Input id="rname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rphone">Their mobile number</Label>
              <Input id="rphone" type="tel" inputMode="numeric" value={phone}
                onChange={(e) => setPhone(normalizePhone(e.target.value).slice(0, 10))}
                placeholder="10-digit mobile" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="raddr">Address <span className="text-muted-foreground font-normal">(for verification)</span></Label>
            <Input id="raddr" value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="Society / area, e.g. Elan Homes, Sarjapur" />
          </div>
          <Button type="submit" className="w-full sm:w-auto h-10 gap-2" disabled={addReferral.isPending}>
            {addReferral.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add referral
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Tracked by mobile number. Earnings count from the day you refer them onward.
        </p>
      </Card>

      {/* Referral list */}
      <div>
        <h2 className="font-medium mb-3">Your referrals ({referrals.length})</h2>
        {computed.length === 0 ? (
          <Card className="p-8 rounded-2xl text-center text-sm text-muted-foreground">
            No referrals yet. Add someone above to start earning.
          </Card>
        ) : (
          <div className="space-y-2.5">
            {computed.map((r) => {
              const st = STATUS_STYLE[r.status];
              return (
                <Card key={r.id} className="p-4 rounded-2xl flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{r.referred_name}</p>
                      <Badge style={{ background: st.bg, color: st.color }} className="border-0 text-[11px]">
                        {referralStatusLabel(r.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.referred_phone}
                      {r.status === "purchased" && ` · paid ${inr(r.netPaid)}`}
                      {r.status === "refunded" && ` · refunded`}
                    </p>
                    {r.referred_address && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" /> {r.referred_address}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-lg font-bold" style={{ color: r.earning > 0 ? "#2e9e5b" : "#8a8f9e" }}>
                      {inr(r.earning)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">your cut</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" />
        If a referral gets refunded, your {Math.round(REFERRAL_RATE * 100)}% on that amount is removed automatically.
      </p>
    </div>
  );
}
