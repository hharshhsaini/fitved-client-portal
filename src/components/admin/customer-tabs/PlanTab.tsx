import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type PlanType = "1-month" | "3-month" | "6-month";
type PlanStatus = "active" | "paused" | "cancelled";

export function PlanTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: plan } = useQuery({
    queryKey: ["customer-plan", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const [type, setType] = useState<PlanType>("1-month");
  const [amount, setAmount] = useState<number>(7499);
  const [startDate, setStartDate] = useState("");
  const [nextPayment, setNextPayment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [status, setStatus] = useState<PlanStatus>("active");

  useEffect(() => {
    if (plan) {
      setType(plan.type as PlanType);
      setAmount(Number(plan.amount));
      setStartDate(plan.start_date);
      setNextPayment(plan.next_payment_date);
      setPaymentMethod(plan.payment_method ?? "");
      setAutoRenew(plan.auto_renew);
      setStatus(plan.status as PlanStatus);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const next = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      setStartDate(today); setNextPayment(next);
    }
  }, [plan]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: userId,
        type, amount, start_date: startDate, next_payment_date: nextPayment,
        payment_method: paymentMethod || null, auto_renew: autoRenew, status,
      };
      if (plan) {
        const { error } = await supabase.from("plans").update(payload).eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(plan ? "Plan updated" : "Plan created");
      qc.invalidateQueries({ queryKey: ["customer-plan", userId] });
      qc.invalidateQueries({ queryKey: ["admin-customer-list"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  return (
    <div className="space-y-4 max-w-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Plan type</Label>
          <Select value={type} onValueChange={(v) => setType(v as PlanType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1-month">1-month</SelectItem>
              <SelectItem value="3-month">3-month</SelectItem>
              <SelectItem value="6-month">6-month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Amount (₹)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Next payment date</Label>
          <Input type="date" value={nextPayment} onChange={(e) => setNextPayment(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Payment method</Label>
          <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="UPI / Card / Cash" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as PlanStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label>Auto-renew</Label>
        <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving…" : plan ? "Update plan" : "Create plan"}
      </Button>
    </div>
  );
}
