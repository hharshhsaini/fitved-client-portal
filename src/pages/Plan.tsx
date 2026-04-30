import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { formatDate, daysBetween } from "@/lib/dates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Plan() {
  const { user } = useAuth();
  const [autoRenew, setAutoRenew] = useState(true);

  const { data: plan } = useQuery({
    queryKey: ["plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("plans").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) setAutoRenew(data.auto_renew);
      return data;
    },
  });

  const { data: billing = [] } = useQuery({
    queryKey: ["billing", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("billing_history").select("*").eq("user_id", user!.id)
        .order("payment_date", { ascending: false });
      return data ?? [];
    },
  });

  if (!plan) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-3xl text-foreground">Your plan</h1>
          <p className="mt-1 text-muted-foreground">All the details about your current Fitved plan.</p>
        </header>
        <Card className="p-8 rounded-2xl shadow-card text-center">
          <p className="text-muted-foreground">No plan assigned yet — your trainer will set this up.</p>
        </Card>
      </div>
    );
  }

  const totalDays = daysBetween(plan.start_date, plan.next_payment_date);
  const elapsed = daysBetween(plan.start_date, new Date().toISOString());
  const daysLeft = Math.max(0, totalDays - elapsed);

  const handleAutoRenew = async (v: boolean) => {
    setAutoRenew(v);
    const { error } = await supabase.from("plans").update({ auto_renew: v }).eq("id", plan.id);
    if (error) toast.error(error.message);
    else toast.success(v ? "Auto-renew enabled" : "Auto-renew disabled");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-foreground">Your plan</h1>
        <p className="mt-1 text-muted-foreground">All the details about your current Fitved plan.</p>
      </header>

      <Card className="p-6 md:p-8 rounded-2xl shadow-card overflow-hidden relative">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-soft">
              <CreditCard className="h-6 w-6" />
            </span>
            <div>
              <Badge className="mb-2 bg-primary-soft text-primary hover:bg-primary-soft">{plan.type} plan</Badge>
              <p className="font-display text-2xl">₹{Number(plan.amount).toLocaleString("en-IN")}</p>
              <p className="text-sm text-muted-foreground">per cycle</p>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {plan.status}
          </Badge>
        </div>

        <Separator className="my-6" />

        <dl className="grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">Plan started</dt>
            <dd className="mt-1 font-medium">{formatDate(plan.start_date)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Next payment due</dt>
            <dd className="mt-1 font-medium">{formatDate(plan.next_payment_date)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Days remaining</dt>
            <dd className="mt-1 font-medium">{daysLeft} days</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Payment method</dt>
            <dd className="mt-1 font-medium">{plan.payment_method ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <div>
              <p className="font-medium">Auto-renewal</p>
              <p className="text-xs text-muted-foreground">Renew automatically at the end of each cycle.</p>
            </div>
            <Switch checked={autoRenew} onCheckedChange={handleAutoRenew} />
          </div>
        </dl>
      </Card>

      <Card className="p-6 rounded-2xl shadow-card">
        <h2 className="font-display text-xl">Billing history</h2>
        {billing.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {billing.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{formatDate(b.payment_date)}</p>
                  <p className="text-xs text-muted-foreground">{b.method ?? "—"}</p>
                </div>
                <p className="font-medium">₹{Number(b.amount).toLocaleString("en-IN")}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
